<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkerController extends Controller
{
    public function index(Request $request)
    {
        $page = max(1, (int) $request->input('page', 1));
        $perPage = 12;
        $offset = ($page - 1) * $perPage;

        $conditions = '1=1';

        if ($request->filled('trade')) {
            $trade = $request->string('trade');
            $conditions .= " AND w.[trade] = '$trade'";
        }

        $totalRow = DB::select("SELECT COUNT(*) AS total FROM [workers] w WHERE $conditions");
        $total = $totalRow[0]->total ?? 0;

        $rows = DB::select(
            "SELECT w.*, v.total_earned, v.average_task_budget, v.complaints_count 
             FROM [workers] w
             LEFT JOIN worker_quality_stats_view v ON w.user_id = v.worker_id
             WHERE $conditions 
             ORDER BY w.[rating] DESC 
             OFFSET $offset ROWS FETCH NEXT $perPage ROWS ONLY"
        );

        return response()->json([
            'data' => $rows,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
        ]);
    }

    public function show(Request $request, $worker)
    {
        $rows = DB::select(
            "SELECT w.*, v.total_earned, v.average_task_budget, v.complaints_count 
             FROM [workers] w
             LEFT JOIN worker_quality_stats_view v ON w.user_id = v.worker_id
             WHERE w.[id] = $worker"
        );
        $workerRow = $rows[0] ?? null;

        if (!$workerRow) {
            return response()->json(['message' => 'Worker not found.'], 404);
        }

        return response()->json($workerRow);
    }
}
