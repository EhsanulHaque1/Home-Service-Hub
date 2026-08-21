<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComplaintController extends Controller
{
    public const CATEGORIES = [
        'Late arrival',
        'Poor work quality',
        'Unprofessional behavior',
        'Overcharging',
        'No-show',
        'Other',
    ];

    public function index()
    {
        $page = 1;
        $perPage = 15;
        $offset = 0;

        $totalRow = DB::select("SELECT COUNT(*) AS total FROM [complaints]");
        $total = $totalRow[0]->total ?? 0;

        $rows = DB::select(
            "SELECT * FROM [complaints] ORDER BY [created_at] DESC OFFSET $offset ROWS FETCH NEXT $perPage ROWS ONLY"
        );

        return response()->json([
            'data' => $rows,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
        ]);
    }

    public function store(Request $request)
    {
        $clientName = $request->input('client_name');
        $clientEmail = $request->input('client_email');
        $workerName = $request->input('worker_name');
        $workerEmail = $request->input('worker_email');
        $category = $request->input('category');
        $description = $request->input('description');

        DB::insert(
            "INSERT INTO [complaints] ([client_name], [client_email], [worker_name], [worker_email], [category], [description], [status], [created_at], [updated_at])
             VALUES ('$clientName', '$clientEmail', '$workerName', '$workerEmail', '$category', '$description', 'pending', GETDATE(), GETDATE())"
        );

        $id = DB::getPdo()->lastInsertId();
        $rows = DB::select("SELECT * FROM [complaints] WHERE [id] = $id");

        return response()->json($rows[0] ?? null, 201);
    }
}
