<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeedbackController extends Controller
{
    public const CATEGORIES = [
        'Bug Report',
        'Feature Request',
        'UI/UX Improvement',
        'Performance Issue',
        'General Feedback',
    ];

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $page = max(1, (int) $request->input('page', 1));
        $perPage = 15;
        $offset = ($page - 1) * $perPage;

        $totalRow = DB::select("SELECT COUNT(*) AS total FROM [feedback] WHERE [user_id] = $userId");
        $total = $totalRow[0]->total ?? 0;

        $rows = DB::select(
            "SELECT * FROM [feedback] WHERE [user_id] = $userId ORDER BY [created_at] DESC OFFSET $offset ROWS FETCH NEXT $perPage ROWS ONLY"
        );

        return response()->json([
            'data' => $rows,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $category = $request->input('category');
        $message = $request->input('message');

        DB::insert(
            "INSERT INTO [feedback] ([user_id], [category], [message], [status], [created_at], [updated_at])
             VALUES ($userId, '$category', '$message', 'open', GETDATE(), GETDATE())"
        );

        $id = DB::getPdo()->lastInsertId();
        $rows = DB::select("SELECT * FROM [feedback] WHERE [id] = $id");

        return response()->json($rows[0] ?? null, 201);
    }

    public function show(Request $request, $feedback): JsonResponse
    {
        $userId = $request->user()->id;

        $rows = DB::select("SELECT * FROM [feedback] WHERE [id] = $feedback");
        $feedbackRow = $rows[0] ?? null;

        if (!$feedbackRow) {
            return response()->json(['message' => 'Feedback not found.'], 404);
        }

        if ($feedbackRow->user_id != $userId) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        return response()->json($feedbackRow);
    }
}
