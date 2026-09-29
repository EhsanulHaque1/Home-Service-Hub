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

    /**
     * Ensure the sp_submit_feedback stored procedure exists (idempotent).
     * Uses raw DB statement to CREATE PROCEDURE, analogous to:
     *   CREATE PROCEDURE SubmitFeedback
     *     @user_id INT, @category VARCHAR(255), @message NVARCHAR(MAX)
     *   AS BEGIN ... END;
     * The procedure handles the INSERT and returns the inserted row.
     */
    private function ensureSubmitFeedbackProcedure()
    {
        $exists = DB::selectOne(
            "SELECT OBJECT_ID('dbo.sp_submit_feedback', 'P') AS [id]"
        )->id;

        if ($exists) {
            return true;
        }

        DB::statement("
            CREATE PROCEDURE sp_submit_feedback
                @user_id   INT,
                @category  VARCHAR(255) = NULL,
                @message   NVARCHAR(MAX)
            AS
            BEGIN
                SET NOCOUNT ON;

                INSERT INTO [feedback]
                    ([user_id], [category], [message], [status], [created_at], [updated_at])
                VALUES
                    (@user_id, @category, @message, 'open', GETDATE(), GETDATE());

                SELECT f.* FROM [feedback] f WHERE f.[id] = SCOPE_IDENTITY();
            END
        ");

        return (bool) DB::selectOne("SELECT OBJECT_ID('dbo.sp_submit_feedback', 'P') AS [id]")->id;
    }

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

        $this->ensureSubmitFeedbackProcedure();

        $rows = DB::select(
            "EXEC sp_submit_feedback @user_id = ?, @category = ?, @message = ?",
            [$userId, $category, $message]
        );

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

    /**
     * Ensure the sp_search_feedback_by_id procedure exists (idempotent).
     * Uses raw DB statement, follows the PaymentController ensureSearchPaymentByIdProcedure pattern.
     */
    private function ensureSearchFeedbackByIdProcedure()
    {
        $exists = DB::selectOne(
            "SELECT OBJECT_ID('dbo.sp_search_feedback_by_id', 'P') AS [id]"
        )->id;

        if ($exists) {
            return true;
        }

        DB::statement("DROP PROCEDURE IF EXISTS sp_search_feedback_by_id");

        DB::statement("
            CREATE PROCEDURE sp_search_feedback_by_id
                @feedback_id INT
            AS
            BEGIN
                SET NOCOUNT ON;

                SELECT
                    f.[id],
                    f.[category],
                    f.[message],
                    f.[status],
                    f.[created_at],
                    u.[name] AS customer_name,
                    u.[email] AS customer_email,
                    CAST((
                        SELECT COUNT(*)
                        FROM [feedback] f2
                        WHERE f2.[user_id] = f.[user_id]
                    ) AS INT) AS total_feedback_by_user,
                    CAST((
                        SELECT COUNT(*)
                        FROM [feedback] f3
                        WHERE f3.[status] = 'open'
                    ) AS INT) AS open_feedback_total
                FROM [feedback] f
                INNER JOIN [users] u ON u.[id] = f.[user_id]
                WHERE f.[id] = @feedback_id;
            END
        ");

        return (bool) DB::selectOne("SELECT OBJECT_ID('dbo.sp_search_feedback_by_id', 'P') AS [id]")->id;
    }

    /**
     * Admin: Search feedback by ID using stored procedure.
     */
    public function adminSearchById(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $feedbackId = $request->query('feedback_id');

        if (empty($feedbackId) || !is_numeric($feedbackId)) {
            return response()->json(['message' => 'Invalid feedback_id.'], 400);
        }

        $rows = null;
        if ($this->ensureSearchFeedbackByIdProcedure()) {
            $rows = DB::select(
                "EXEC sp_search_feedback_by_id @feedback_id = ?",
                [(int) $feedbackId]
            );
        }

        if (!$rows) {
            $rows = DB::select(
                "SELECT
                    f.[id],
                    f.[category],
                    f.[message],
                    f.[status],
                    f.[created_at],
                    u.[name] AS customer_name,
                    u.[email] AS customer_email
                 FROM [feedback] f
                 INNER JOIN [users] u ON u.[id] = f.[user_id]
                 WHERE f.[id] = ?",
                [(int) $feedbackId]
            );
        }

        return response()->json($rows);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rows = DB::select(
            "SELECT
                f.[id],
                f.[category],
                f.[message],
                f.[status],
                f.[created_at],
                u.[name] AS customer_name,
                u.[email] AS customer_email,
                CAST((
                    SELECT COUNT(*)
                    FROM [feedback] f2
                    WHERE f2.[user_id] = f.[user_id]
                ) AS INT) AS total_feedback_by_user,
                CAST((
                    SELECT COUNT(*)
                    FROM [feedback] f3
                    WHERE f3.[status] = 'open'
                ) AS INT) AS open_feedback_total
             FROM [feedback] f
             INNER JOIN [users] u ON u.[id] = f.[user_id]
             ORDER BY f.[created_at] DESC"
        );

        return response()->json($rows);
    }
}
