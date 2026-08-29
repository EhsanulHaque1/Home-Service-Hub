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
            // SELECT TOP 1 * FROM payments ORDER BY amount DESC
            $top = 'TOP 1';
        } elseif ($rank === '2nd') {
            // SELECT TOP 1 * FROM payments WHERE amount < (SELECT TOP 1 amount FROM payments ORDER BY amount DESC) ORDER BY amount DESC
            $top = 'TOP 1';
            $where = "WHERE p.[amount] < (SELECT TOP 1 [amount] FROM [payments] ORDER BY [amount] DESC)";
        } elseif ($rank === '3rd') {
            // SELECT TOP 1 * FROM payments WHERE amount < (SELECT TOP 1 amount FROM payments WHERE amount < (SELECT TOP 1 amount FROM payments ORDER BY amount DESC) ORDER BY amount DESC) ORDER BY amount DESC
            $top = 'TOP 1';
            $where = "WHERE p.[amount] < (SELECT TOP 1 [amount] FROM [payments] WHERE [amount] < (SELECT TOP 1 [amount] FROM [payments] ORDER BY [amount] DESC) ORDER BY [amount] DESC)";
        }

        $rows = DB::select(
            "SELECT $top p.*, u.[name] AS customer_name, w.[name] AS worker_name, t.[title] AS task_title
             FROM [payments] p
             LEFT JOIN [users] u ON u.[id] = p.[customer_id]
             LEFT JOIN [users] w ON w.[id] = p.[worker_id]
             LEFT JOIN [tasks] t ON t.[id] = p.[task_id]
             $where
             ORDER BY p.[amount] DESC"
        );

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
            DB::update(
                "UPDATE [payments] SET [status] = '$status', [paymentdate] = GETDATE(), [updated_at] = GETDATE() WHERE [paymentid] = $paymentId"
            );

            if ($status === 'successfull') {
                $rows = DB::select("SELECT [task_id] FROM [payments] WHERE [paymentid] = $paymentId");
                $taskId = $rows[0]->task_id ?? null;
                if ($taskId) {
                    DB::update(
                        "UPDATE [tasks] SET [progress] = 'The task is finished', [status] = 'completed', [updated_at] = GETDATE() WHERE [id] = $taskId"
                    );
                }
            }
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
