<?php

namespace App\Http\Controllers;

use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskApplicationController extends Controller
{
    /**
     * Create the hire-a-worker procedure if it does not exist yet
     * Uses: STORED PROCEDURE with TRANSACTION (all steps succeed or all fail)
     * 1. checks the caller owns the task, the task is open/matching and the application is pending
     * 2. sets the chosen application to accepted and the others to declined
     * 3. sets tasks.assigned_worker_id and status = 'assigned'
     * 4. inserts a row into task_assignments (skipped if that table does not exist yet)
     */
    private function ensureAcceptApplicationProcedure()
    {
        $exists = DB::selectOne("SELECT OBJECT_ID('dbo.sp_accept_application', 'P') AS [id]")->id;

        if ($exists) {
            return;
        }

        DB::unprepared("
            CREATE PROCEDURE [dbo].[sp_accept_application]
                @application_id BIGINT,
                @client_id BIGINT
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                DECLARE @task_id BIGINT, @worker_id BIGINT, @owner_id BIGINT,
                        @task_status NVARCHAR(255), @app_status NVARCHAR(255), @budget DECIMAL(10, 2);

                BEGIN TRAN;

                    -- UPDLOCK: two requests confirming on the same task at once must wait for each other
                    SELECT @task_id = a.[task_id], @worker_id = a.[user_id], @app_status = a.[status],
                           @owner_id = t.[user_id], @task_status = t.[status], @budget = t.[budget]
                    FROM [task_applications] a WITH (UPDLOCK)
                    INNER JOIN [tasks] t WITH (UPDLOCK) ON t.[id] = a.[task_id]
                    WHERE a.[id] = @application_id;

                    IF @task_id IS NULL
                        THROW 50001, 'Application not found.', 1;
                    IF @owner_id IS NULL OR @owner_id <> @client_id
                        THROW 50002, 'You can only confirm applicants on your own tasks.', 1;
                    IF @task_status NOT IN ('open', 'matching')
                        THROW 50003, 'A worker has already been confirmed for this task.', 1;
                    IF @app_status <> 'pending'
                        THROW 50004, 'This application is no longer pending.', 1;

                    UPDATE [task_applications]
                    SET [status] = CASE WHEN [id] = @application_id THEN 'accepted' ELSE 'declined' END,
                        [updated_at] = GETDATE()
                    WHERE [task_id] = @task_id;

                    UPDATE [tasks]
                    SET [assigned_worker_id] = @worker_id, [status] = 'assigned', [updated_at] = GETDATE()
                    WHERE [id] = @task_id;

                    IF OBJECT_ID('dbo.task_assignments', 'U') IS NOT NULL
                        EXEC sp_executesql
                            N'INSERT INTO [task_assignments] ([task_id], [client_user_id], [worker_user_id], [status],
                                                              [agreed_price], [assigned_at], [created_at], [updated_at])
                              VALUES (@task_id, @client_id, @worker_id, ''assigned'', @budget, GETDATE(), GETDATE(), GETDATE())',
                            N'@task_id BIGINT, @client_id BIGINT, @worker_id BIGINT, @budget DECIMAL(10, 2)',
                            @task_id, @client_id, @worker_id, @budget;

                COMMIT;

                SELECT @task_id AS [task_id], @worker_id AS [worker_id];
            END
        ");
    }

    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $rows = DB::select(
            "SELECT ta.*, t.[id] AS t_id, t.[title] AS t_title, t.[budget] AS t_budget, t.[status] AS t_status,
                    t.[category] AS t_category, t.[location] AS t_location, t.[user_id] AS t_user_id, t.[progress] AS t_progress
             FROM [task_applications] ta
             LEFT JOIN [tasks] t ON t.[id] = ta.[task_id]
             WHERE ta.[user_id] = $userId
             ORDER BY ta.[created_at] DESC"
        );

        $applications = array_map(function ($row) {
            $task = $row->t_id ? (object) [
                'id' => $row->t_id,
                'title' => $row->t_title,
                'budget' => $row->t_budget,
                'status' => $row->t_status,
                'category' => $row->t_category,
                'location' => $row->t_location,
                'user_id' => $row->t_user_id,
                'progress' => $row->t_progress,
            ] : null;

            return (object) [
                'id' => $row->id,
                'task_id' => $row->task_id,
                'user_id' => $row->user_id,
                'message' => $row->message,
                'status' => $row->status,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
                'task' => $task,
            ];
        }, $rows);

        return response()->json($applications);
    }

    /**
     * Create the application rules trigger if it does not exist yet
     * Uses: INSTEAD OF INSERT TRIGGER (runs for every insert, whichever code path makes it)
     * Blocks:
     *   - a client applying to their own task
     *   - an applicant whose role is not worker
     *   - applying to a task that is not open / matching
     * Then inserts the valid rows and moves the task from open to matching.
     */
    private function ensureApplicationsValidateTrigger()
    {
        $exists = DB::selectOne("SELECT OBJECT_ID('dbo.trg_applications_validate', 'TR') AS [id]")->id;

        if ($exists) {
            return;
        }

        DB::unprepared("
            CREATE TRIGGER [dbo].[trg_applications_validate] ON [dbo].[task_applications]
            INSTEAD OF INSERT
            AS
            BEGIN
                SET NOCOUNT ON;

                -- inserted can hold many rows: always check it as a set
                IF EXISTS (SELECT 1 FROM inserted i INNER JOIN [tasks] t ON t.[id] = i.[task_id]
                           WHERE t.[user_id] = i.[user_id])
                    THROW 50021, 'You cannot apply to your own task.', 1;

                IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN [users] u ON u.[id] = i.[user_id]
                           WHERE u.[role] IS NULL OR u.[role] <> 'worker')
                    THROW 50022, 'Only worker accounts can apply to tasks.', 1;

                IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN [tasks] t ON t.[id] = i.[task_id]
                           WHERE t.[status] IS NULL OR t.[status] NOT IN ('open', 'matching'))
                    THROW 50023, 'This task is no longer accepting applications.', 1;

                INSERT INTO [task_applications] ([task_id], [user_id], [message], [status], [created_at], [updated_at])
                SELECT [task_id], [user_id], [message], ISNULL([status], 'pending'),
                       ISNULL([created_at], GETDATE()), ISNULL([updated_at], GETDATE())
                FROM inserted;

                -- First application moves the task from open to matching
                UPDATE t
                SET t.[status] = 'matching', t.[updated_at] = GETDATE()
                FROM [tasks] t
                WHERE t.[status] = 'open' AND t.[id] IN (SELECT [task_id] FROM inserted);
            END
        ");
    }

    public function store(Request $request, $task)
    {
        $this->ensureApplicationsValidateTrigger();

        $user = $request->user();
        $task = (int) $task;

        $taskRows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");
        $taskRow = $taskRows[0] ?? null;

        if (!$taskRow) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        // Role, own-task and task-status rules are enforced by trg_applications_validate
        $expertise = $user->expertise ?? [];
        if ($user->role === 'worker' && !in_array($taskRow->category, $expertise, true)) {
            return response()->json([
                'message' => 'You can only apply to tasks in your areas of expertise.',
            ], 403);
        }

        $existing = DB::select("SELECT COUNT(*) AS c FROM [task_applications] WHERE [task_id] = $task AND [user_id] = $user->id");
        if (($existing[0]->c ?? 0) > 0) {
            return response()->json([
                'message' => 'You already applied to this task.',
            ], 409);
        }

        // Errors raised by THROW inside the trigger => HTTP response
        $errors = [
            50021 => [403, 'You cannot apply to your own task.'],
            50022 => [403, 'Only worker accounts can apply to tasks.'],
            50023 => [422, 'This task is no longer accepting applications.'],
        ];

        try {
            DB::insert(
                "INSERT INTO [task_applications] ([task_id], [user_id], [message], [status], [created_at], [updated_at])
                 VALUES (?, ?, ?, 'pending', GETDATE(), GETDATE())",
                [$task, $user->id, $request->input('message')]
            );
        } catch (QueryException $e) {
            $code = (int) ($e->errorInfo[1] ?? 0);
            if (isset($errors[$code])) {
                return response()->json(['message' => $errors[$code][1]], $errors[$code][0]);
            }
            return response()->json(['message' => 'Failed to submit application.'], 500);
        }

        // lastInsertId() is NULL behind an INSTEAD OF trigger, so look the row up by (task_id, user_id), which is unique
        $appRows = DB::select("SELECT * FROM [task_applications] WHERE [task_id] = $task AND [user_id] = $user->id");
        $taskRows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");

        return response()->json([
            'application' => $appRows[0] ?? null,
            'task' => $taskRows[0] ?? null,
        ], 201);
    }

    public function confirm(Request $request, $application)
    {
        $this->ensureAcceptApplicationProcedure();

        // Errors raised by THROW inside the procedure => HTTP response
        $errors = [
            50001 => [404, 'Application not found.'],
            50002 => [403, 'You can only confirm applicants on your own tasks.'],
            50003 => [422, 'A worker has already been confirmed for this task.'],
            50004 => [422, 'This application is no longer pending.'],
        ];

        try {
            $result = DB::select('EXEC [dbo].[sp_accept_application] ?, ?', [(int) $application, $request->user()->id]);
        } catch (QueryException $e) {
            $code = (int) ($e->errorInfo[1] ?? 0);
            if (isset($errors[$code])) {
                return response()->json(['message' => $errors[$code][1]], $errors[$code][0]);
            }
            return response()->json(['message' => 'Failed to confirm application.'], 500);
        }

        $taskId = (int) $result[0]->task_id;
        $application = (int) $application;

        \App\Services\UserStatsService::syncTask($taskId);

        $appRows = DB::select("SELECT * FROM [task_applications] WHERE [id] = $application");
        $taskRows = DB::select(
            "SELECT t.*, u.[name] AS assigned_worker_name, u.[expertise] AS assigned_worker_expertise, u.[location] AS assigned_worker_location, u.[phone] AS assigned_worker_phone
             FROM [tasks] t LEFT JOIN [users] u ON u.[id] = t.[assigned_worker_id] WHERE t.[id] = $taskId"
        );

        return response()->json([
            'application' => $appRows[0] ?? null,
            'task' => $taskRows[0] ?? null,
        ]);
    }
}
