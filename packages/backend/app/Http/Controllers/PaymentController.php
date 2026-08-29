<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        // SELECT amount, SUM(amount) FROM payments WHERE status = 'Complete'
        $revenueRows = DB::select(
            "SELECT SUM([amount]) AS total
             FROM [payments]
             WHERE [status] = 'Complete'"
        );
        $revenue = (!empty($revenueRows) && $revenueRows[0]->total !== null)
            ? (float) $revenueRows[0]->total
            : 0;

        return response()->json([
            'pending_payments' => $pending,
            'total_revenue' => $revenue,
        ]);
    }
}
