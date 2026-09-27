<?php

namespace App\Http\Controllers;

use App\Services\SslCommerz;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rank = $request->query('rank');
        $allowed = ['none', '1st', '2nd', '3rd'];
        if (!in_array($rank, $allowed, true)) {
            $rank = 'none';
        }

        $top = '';
        $where = '';

        if ($rank === '1st') {
            // SELECT TOP 1 * FROM admin_payments_view ORDER BY amount DESC
            $top = 'TOP 1';
        } elseif ($rank === '2nd') {
            // SELECT TOP 1 * FROM admin_payments_view WHERE amount < (SELECT TOP 1 amount FROM admin_payments_view ORDER BY amount DESC) ORDER BY amount DESC
            $top = 'TOP 1';
            $where = "WHERE [amount] < (SELECT TOP 1 [amount] FROM admin_payments_view ORDER BY [amount] DESC)";
        } elseif ($rank === '3rd') {
            // SELECT TOP 1 * FROM admin_payments_view WHERE amount < (SELECT TOP 1 amount FROM admin_payments_view WHERE amount < (SELECT TOP 1 amount FROM admin_payments_view ORDER BY amount DESC) ORDER BY amount DESC) ORDER BY amount DESC
            $top = 'TOP 1';
            $where = "WHERE [amount] < (SELECT TOP 1 [amount] FROM admin_payments_view WHERE [amount] < (SELECT TOP 1 [amount] FROM admin_payments_view ORDER BY [amount] DESC) ORDER BY [amount] DESC)";
        }

        $rows = DB::select(
            "SELECT $top *
             FROM admin_payments_view
             $where
             ORDER BY [amount] DESC"
        );

        return response()->json($rows);
    }

    /**
     * Ensure the search by ID procedure exists (idempotent).
     */
    private function ensureSearchPaymentByIdProcedure()
    {
        $exists = DB::selectOne("SELECT OBJECT_ID('dbo.sp_search_payment_by_id', 'P') AS [id]")->id;

        if ($exists) {
            return true;
        }

        try {
            DB::statement("DROP PROCEDURE IF EXISTS sp_search_payment_by_id");

            DB::statement("
                CREATE PROCEDURE sp_search_payment_by_id
                    @payment_id INT
                AS
                BEGIN
                    SET NOCOUNT ON;

                    SELECT
                        p.paymentid,
                        p.customer_id,
                        p.worker_id,
                        p.task_id,
                        p.amount,
                        p.status,
                        p.paymentdate,
                        p.created_at,
                        p.updated_at,
                        u.name AS customer_name,
                        w.name AS worker_name,
                        t.title AS task_title
                    FROM payments p
                    LEFT JOIN users u ON u.id = p.customer_id
                    LEFT JOIN users w ON w.id = p.worker_id
                    LEFT JOIN tasks t ON t.id = p.task_id
                    WHERE p.paymentid = @payment_id
                    ORDER BY p.paymentdate DESC;
                END;
            ");

            return (bool) DB::selectOne("SELECT OBJECT_ID('dbo.sp_search_payment_by_id', 'P') AS [id]")->id;
        } catch (\Throwable $e) {
            report($e);
            return false;
        }
    }

    /**
     * Admin: Search payment by ID using stored procedure.
     * Returns single record or empty array if not found.
     */
    public function adminSearchById(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $paymentId = $request->query('payment_id');

        if (empty($paymentId) || !is_numeric($paymentId)) {
            return response()->json(['message' => 'Invalid payment_id.'], 400);
        }

        $rows = null;
        if ($this->ensureSearchPaymentByIdProcedure()) {
            $rows = DB::select(
                "EXEC sp_search_payment_by_id @payment_id = ?",
                [(int) $paymentId]
            );
        }

        // Fallback: direct query if procedure unavailable
        if (!$rows) {
            $rows = DB::select(
                "SELECT
                    p.paymentid, p.customer_id, p.worker_id, p.task_id, p.amount, p.status, p.paymentdate, p.created_at, p.updated_at,
                    u.name AS customer_name, w.name AS worker_name, t.title AS task_title
                 FROM payments p
                 LEFT JOIN users u ON u.id = p.customer_id
                 LEFT JOIN users w ON w.id = p.worker_id
                 LEFT JOIN tasks t ON t.id = p.task_id
                 WHERE p.paymentid = ?",
                [(int) $paymentId]
            );
        }

        return response()->json($rows);
    }

    public function summary(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // SELECT status, COUNT(status) FROM payments WHERE status = 'pending'
        $pendingRows = DB::select(
            "SELECT [status], COUNT([status]) AS count
             FROM [payments]
             WHERE [status] = 'pending'
             GROUP BY [status]"
        );
        $pending = !empty($pendingRows) ? (int) $pendingRows[0]->count : 0;

        // SELECT amount, SUM(amount) FROM payments WHERE status = 'successfull'
        $revenueRows = DB::select(
            "SELECT SUM([amount]) AS total
             FROM [payments]
             WHERE [status] = 'successfull'"
        );
        $revenue = (!empty($revenueRows) && $revenueRows[0]->total !== null)
            ? (float) $revenueRows[0]->total
            : 0;

        return response()->json([
            'pending_payments' => $pending,
            'total_revenue' => $revenue,
        ]);
    }

    /**
     * Start an SSLCommerz session for a task's pending payment and return the
     * gateway redirect URL. Only the task owner (the customer) may do this.
     */
    public function initiate(Request $request, $task): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'You must be logged in to pay.'], 401);
        }
        $userId = $user->id;

        $taskRows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");
        $taskRow = $taskRows[0] ?? null;
        if (!$taskRow) {
            return response()->json(['message' => 'Task not found.'], 404);
        }
        if ($taskRow->user_id != $userId) {
            return response()->json(['message' => 'Only the task owner can pay.'], 403);
        }

        $payRows = DB::select("SELECT TOP 1 * FROM [payments] WHERE [task_id] = $task ORDER BY [paymentid] DESC");
        $payment = $payRows[0] ?? null;
        if (!$payment) {
            return response()->json(['message' => 'No payment found for this task.'], 404);
        }

        $tranId = 'pay_' . $payment->paymentid . '_' . time();

        $custRows = DB::select("SELECT * FROM [users] WHERE [id] = $payment->customer_id");
        $cust = $custRows[0] ?? null;

        $payload = [
            'total_amount' => (float) $payment->amount,
            'tran_id' => $tranId,
            'success_url' => url('/payments/sslcommerz/success'),
            'fail_url' => url('/payments/sslcommerz/fail'),
            'cancel_url' => url('/payments/sslcommerz/cancel'),
            'product_name' => $taskRow->title ?? 'Task',
            'product_category' => 'Home Service',
            'product_profile' => 'general',
            'cus_name' => $cust->name ?? 'Customer',
            'cus_email' => $cust->email ?? 'customer@example.com',
            'cus_phone' => $cust->phone ?? '01700000000',
            'cus_address' => $cust->location ?? 'Bangladesh',
            'cus_city' => $cust->location ?? 'Dhaka',
            'cus_country' => 'Bangladesh',
            'shipping_method' => 'NO',
            'num_of_item' => 1,
        ];

        $url = (new SslCommerz())->initiate($payload);
        if (empty($url) || ($url['status'] ?? '') !== 'SUCCESS' || empty($url['GatewayPageURL'])) {
            $reason = $url['status']
                ?? $url['error']
                ?? ($url['failedreason'] ?? 'gateway_error');
            return response()->json(['message' => 'Could not initiate payment gateway: ' . $reason], 422);
        }

        return response()->json(['url' => $url['GatewayPageURL'], 'tran_id' => $tranId]);
    }

    /**
     * Apply a final status to the payment identified by the SSLCommerz tran_id
     * (encoded as pay_{paymentid}_{time}) and redirect back to the SPA.
     */
    private function finishPayment(?string $tranId, string $status): string
    {
        $paymentId = null;
        if (preg_match('/^pay_(\d+)_/', (string) $tranId, $m)) {
            $paymentId = (int) $m[1];
        }

        if ($paymentId) {
            $sql = "
                BEGIN TRANSACTION;

                -- 1. Update payment status
                UPDATE [payments] 
                SET [status] = '$status', [paymentdate] = GETDATE(), [updated_at] = GETDATE() 
                WHERE [paymentid] = $paymentId;
            ";

            if ($status === 'successfull') {
                $sql .= "
                    -- 2. Get payment details and update related tables
                    DECLARE @taskId INT, @customerId INT, @workerId INT;
                    
                    SELECT @taskId = [task_id], @customerId = [customer_id], @workerId = [worker_id]
                    FROM [payments] WHERE [paymentid] = $paymentId;

                    -- 3. Update task status
                    IF @taskId IS NOT NULL
                    BEGIN
                        UPDATE [tasks] 
                        SET [progress] = 'The task is finished', [status] = 'completed', [updated_at] = GETDATE() 
                        WHERE [id] = @taskId;
                    END

                    -- 4. Update users table: total_spent for customer
                    IF @customerId IS NOT NULL
                    BEGIN
                        UPDATE [users] 
                        SET [total_spent] = ISNULL((
                            SELECT SUM(p.[amount]) 
                            FROM [payments] p 
                            WHERE p.[customer_id] = [users].[id] 
                              AND p.[status] IN ('Complete', 'complete', 'completed', 'successfull', 'successful', 'Paid', 'paid', 'success')
                        ), 0) 
                        WHERE [id] = @customerId;
                    END

                    -- 5. Update users table: total_earned for worker
                    IF @workerId IS NOT NULL
                    BEGIN
                        UPDATE [users] 
                        SET [total_earned] = ISNULL((
                            SELECT SUM(p.[amount]) 
                            FROM [payments] p 
                            WHERE p.[worker_id] = [users].[id] 
                              AND p.[status] IN ('Complete', 'complete', 'completed', 'successfull', 'successful', 'Paid', 'paid', 'success')
                        ), 0) 
                        WHERE [id] = @workerId;
                    END

                    -- 6. Update clients table: total_money_spent
                    IF @customerId IS NOT NULL
                    BEGIN
                        UPDATE [clients] 
                        SET [total_money_spent] = ISNULL((
                            SELECT SUM(p.[amount]) 
                            FROM [payments] p 
                            WHERE p.[customer_id] = [clients].[user_id] 
                              AND p.[status] IN ('Complete', 'complete', 'completed', 'successfull', 'successful', 'Paid', 'paid', 'success')
                        ), 0) 
                        WHERE [user_id] = @customerId;
                    END

                    -- 7. Update workers table: total_money_gained
                    IF @workerId IS NOT NULL
                    BEGIN
                        UPDATE [workers] 
                        SET [total_money_gained] = ISNULL((
                            SELECT SUM(p.[amount]) 
                            FROM [payments] p 
                            WHERE p.[worker_id] = [workers].[user_id] 
                              AND p.[status] IN ('Complete', 'complete', 'completed', 'successfull', 'successful', 'Paid', 'paid', 'success')
                        ), 0) 
                        WHERE [user_id] = @workerId;
                    END
                ";
            }

            $sql .= "
                COMMIT TRANSACTION;
            ";

            DB::unprepared($sql);
        }

        $front = rtrim(Config::get('sslcommerz.frontend_url', 'http://localhost:5173'), '/');

        return $front . '/dashboard?payment=' . ($status === 'successfull' ? 'success' : 'failed');
    }

    public function success(Request $request)
    {
        $tranId = $request->input('tran_id');
        $valId = $request->input('val_id');

        $status = 'failed';
        if ($valId) {
            $result = (new SslCommerz())->validate($valId);
            if (($result['status'] ?? '') === 'VALID') {
                $status = 'successfull';
            }
        }

        return redirect()->away($this->finishPayment($tranId, $status));
    }

    public function fail(Request $request)
    {
        return redirect()->away($this->finishPayment($request->input('tran_id'), 'failed'));
    }

    public function cancel(Request $request)
    {
        return redirect()->away($this->finishPayment($request->input('tran_id'), 'failed'));
    }
}
