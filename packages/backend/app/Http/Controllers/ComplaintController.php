<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
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

    /**
     * Ensure the admin_complaints_view exists (idempotent).
     * Uses JOIN with users table on worker_email to enrich complaint records.
     * Follows the same pattern as admin_payments_view.
     */
    private function ensureAdminComplaintsView()
    {
        DB::statement("DROP VIEW IF EXISTS [admin_complaints_view]");

        DB::statement("
            CREATE VIEW admin_complaints_view AS
            SELECT
                c.[id] AS complaint_id,
                c.[client_name],
                c.[client_email],
                c.[worker_name],
                c.[worker_email],
                c.[category],
                c.[description],
                c.[status],
                c.[created_at],
                c.[updated_at],
                u.[id] AS worker_user_id,
                u.[role] AS worker_role,
                u.[location] AS worker_location,
                u.[expertise] AS worker_expertise,
                u.[total_earned] AS worker_total_earned,
                (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = u.[id]) AS worker_tasks_done
            FROM [complaints] c
            LEFT JOIN [users] u ON c.[worker_email] = u.[email]
        ");
    }

    /**
     * Admin: List all complaints via the admin_complaints_view VIEW.
     * Uses raw DB query with VIEW + JOIN, rank-based ordering.
     */
    public function adminIndex(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rank = $request->query('rank');
        $allowed = ['none', '1st', '2nd', '3rd'];
        if (!in_array($rank, $allowed, true)) {
            $rank = 'none';
        }

        $this->ensureAdminComplaintsView();

        $top = '';
        $offsetClause = '';

        if ($rank === '1st') {
            $top = 'TOP 1';
        } elseif ($rank === '2nd') {
            $offsetClause = "OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY";
        } elseif ($rank === '3rd') {
            $offsetClause = "OFFSET 2 ROWS FETCH NEXT 1 ROWS ONLY";
        }

        $sql = "SELECT $top * FROM [admin_complaints_view] ORDER BY [created_at] DESC $offsetClause";

        $rows = DB::select($sql);

        foreach ($rows as $row) {
            $decoded = !empty($row->worker_expertise) ? json_decode($row->worker_expertise, true) : null;
            if (is_array($decoded) && !empty($decoded)) {
                $row->worker_trade = implode(', ', $decoded);
            } elseif (is_string($decoded)) {
                $row->worker_trade = $decoded;
            } else {
                $row->worker_trade = '—';
            }
        }

        return response()->json($rows);
    }

    /**
     * Ensure the sp_search_complaint_by_id stored procedure exists (idempotent).
     * Uses raw DB statement, follows the PaymentController ensureSearchPaymentByIdProcedure pattern.
     */
    private function ensureSearchComplaintByIdProcedure()
    {
        $exists = DB::selectOne(
            "SELECT OBJECT_ID('dbo.sp_search_complaint_by_id', 'P') AS [id]"
        )->id;

        if ($exists) {
            return true;
        }

        DB::statement("DROP PROCEDURE IF EXISTS sp_search_complaint_by_id");

        DB::statement("
            CREATE PROCEDURE sp_search_complaint_by_id
                @complaint_id INT
            AS
            BEGIN
                SET NOCOUNT ON;

                SELECT * FROM [admin_complaints_view] WHERE [complaint_id] = @complaint_id;
            END
        ");

        return (bool) DB::selectOne("SELECT OBJECT_ID('dbo.sp_search_complaint_by_id', 'P') AS [id]")->id;
    }

    /**
     * Admin: Search a complaint by ID using stored procedure.
     */
    public function adminSearchById(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $complaintId = $request->query('complaint_id');

        if (empty($complaintId) || !is_numeric($complaintId)) {
            return response()->json(['message' => 'Invalid complaint_id.'], 400);
        }

        $this->ensureAdminComplaintsView();

        $rows = null;
        if ($this->ensureSearchComplaintByIdProcedure()) {
            $rows = DB::select(
                "EXEC sp_search_complaint_by_id @complaint_id = ?",
                [(int) $complaintId]
            );
        }

        if (!$rows) {
            $rows = DB::select(
                "SELECT * FROM [admin_complaints_view] WHERE [complaint_id] = ?",
                [(int) $complaintId]
            );
        }

        foreach ($rows as $row) {
            $decoded = !empty($row->worker_expertise) ? json_decode($row->worker_expertise, true) : null;
            if (is_array($decoded) && !empty($decoded)) {
                $row->worker_trade = implode(', ', $decoded);
            } elseif (is_string($decoded)) {
                $row->worker_trade = $decoded;
            } else {
                $row->worker_trade = '—';
            }
        }

        return response()->json($rows);
    }

    /**
     * Ensure the sp_submit_complaint stored procedure exists (idempotent).
     * Uses raw DB statement to CREATE PROCEDURE, analogous to:
     *   CREATE PROCEDURE GetEmployeesByDepartment
     *     @Dept VARCHAR(30)
     *   AS BEGIN ... END;
     * The procedure handles the INSERT and returns the inserted row.
     */
    private function ensureSubmitComplaintProcedure()
    {
        $exists = DB::selectOne(
            "SELECT OBJECT_ID('dbo.sp_submit_complaint', 'P') AS [id]"
        )->id;

        if ($exists) {
            return true;
        }

        DB::statement("
            CREATE PROCEDURE sp_submit_complaint
                @client_name   VARCHAR(255),
                @client_email  VARCHAR(255),
                @worker_name   VARCHAR(255),
                @worker_email  VARCHAR(255) = NULL,
                @category      VARCHAR(255),
                @description   NVARCHAR(MAX)
            AS
            BEGIN
                SET NOCOUNT ON;

                INSERT INTO [complaints]
                    ([client_name], [client_email], [worker_name], [worker_email], [category], [description], [status], [created_at], [updated_at])
                VALUES
                    (@client_name, @client_email, @worker_name, @worker_email, @category, @description, 'pending', GETDATE(), GETDATE());

                SELECT c.* FROM [complaints] c WHERE c.[id] = SCOPE_IDENTITY();
            END
        ");

        return (bool) DB::selectOne("SELECT OBJECT_ID('dbo.sp_submit_complaint', 'P') AS [id]")->id;
    }

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

    public function store(Request $request): JsonResponse
    {
        $clientName = $request->input('client_name');
        $clientEmail = $request->input('client_email');
        $workerName = $request->input('worker_name');
        $workerEmail = $request->input('worker_email');
        $category = $request->input('category');
        $description = $request->input('description');

        $this->ensureSubmitComplaintProcedure();

        $rows = DB::select(
            "EXEC sp_submit_complaint @client_name = ?, @client_email = ?, @worker_name = ?, @worker_email = ?, @category = ?, @description = ?",
            [$clientName, $clientEmail, $workerName, $workerEmail, $category, $description]
        );

        return response()->json($rows[0] ?? null, 201);
    }
}
