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
            $conditions .= " AND [trade] = '$trade'";
        }

        $totalRow = DB::select("SELECT COUNT(*) AS total FROM [workers] WHERE $conditions");
        $total = $totalRow[0]->total ?? 0;

        $rows = DB::select(
            "SELECT * FROM [workers] WHERE $conditions ORDER BY [rating] DESC OFFSET $offset ROWS FETCH NEXT $perPage ROWS ONLY"
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
        $rows = DB::select("SELECT * FROM [workers] WHERE [id] = $worker");
        $workerRow = $rows[0] ?? null;

        if (!$workerRow) {
            return response()->json(['message' => 'Worker not found.'], 404);
        }

        return response()->json($workerRow);
    }
}
