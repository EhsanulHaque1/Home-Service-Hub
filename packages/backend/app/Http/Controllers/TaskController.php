<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $page = max(1, (int) $request->input('page', 1));
        $perPage = 15;
        $offset = ($page - 1) * $perPage;

        $conditions = '1=1';

        if ($request->filled('category')) {
            $categories = array_filter(explode(',', (string) $request->string('category')));
            $quoted = array_map(function ($c) {
                return "'" . $c . "'";
            }, $categories);
            if (!empty($quoted)) {
                $conditions .= ' AND [category] IN (' . implode(',', $quoted) . ')';
            }
        }

        if ($request->filled('status')) {
            $status = $request->string('status');
            $conditions .= " AND [status] = '$status'";
        }

        $totalRow = DB::select("SELECT COUNT(*) AS total FROM [tasks] WHERE $conditions");
        $total = $totalRow[0]->total ?? 0;

        $rows = DB::select(
            "SELECT * FROM [tasks] WHERE $conditions ORDER BY [created_at] DESC OFFSET $offset ROWS FETCH NEXT $perPage ROWS ONLY"
        );

        return response()->json([
            'data' => $rows,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
        ]);
    }

    public function show(Request $request, $task)
    {
        $rows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");
        $taskRow = $rows[0] ?? null;

        if (!$taskRow) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        return response()->json($taskRow);
    }

    public function store(Request $request)
    {
        $userId = $request->user()?->id;
        $userIdSql = $userId === null ? 'NULL' : $userId;

        $title = $request->input('title');
        $description = $request->input('description');
        $category = $request->input('category');
        $budget = (float) $request->input('budget', 0);
        $location = $request->input('location');
        $clientName = $request->input('client_name');
        $clientEmail = $request->input('client_email');

        DB::insert(
            "INSERT INTO [tasks] ([user_id], [title], [description], [category], [budget], [location], [status], [client_name], [client_email], [created_at], [updated_at])
             VALUES ($userIdSql, '$title', '$description', '$category', $budget, '$location', 'open', '$clientName', '$clientEmail', GETDATE(), GETDATE())"
        );

        $id = DB::getPdo()->lastInsertId();
        if ($userId) {
            \App\Services\UserStatsService::syncUser($userId);
        }
        $rows = DB::select("SELECT * FROM [tasks] WHERE [id] = $id");

        return response()->json($rows[0] ?? null, 201);
    }

    public function update(Request $request, $task)
    {
        $rows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");
        $taskRow = $rows[0] ?? null;

        if (!$taskRow) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        if ($taskRow->user_id != $request->user()->id) {
            return response()->json(['message' => 'You can only edit your own tasks.'], 403);
        }

        if (in_array($taskRow->status, ['assigned', 'completed'], true)) {
            return response()->json(['message' => 'This task can no longer be edited.'], 422);
        }

        $title = $request->input('title');
        $description = $request->input('description');
        $category = $request->input('category');
        $budget = (float) $request->input('budget', 0);
        $location = $request->input('location');
        $clientName = $request->input('client_name');
        $clientEmail = $request->input('client_email');

        DB::update(
            "UPDATE [tasks] SET [title] = '$title', [description] = '$description', [category] = '$category', [budget] = $budget, [location] = '$location', [client_name] = '$clientName', [client_email] = '$clientEmail', [updated_at] = GETDATE() WHERE [id] = $task"
        );

        $rows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");

        return response()->json($rows[0] ?? null);
    }

    public function destroy(Request $request, $task)
    {
        $rows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");
        $taskRow = $rows[0] ?? null;

        if (!$taskRow) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        if ($taskRow->user_id != $request->user()->id) {
            return response()->json(['message' => 'You can only delete your own tasks.'], 403);
        }

        if (in_array($taskRow->status, ['assigned', 'completed'], true)) {
            return response()->json(['message' => 'This task can no longer be deleted.'], 422);
        }

        DB::delete("DELETE FROM [tasks] WHERE [id] = $task");
        \App\Services\UserStatsService::syncUser(array_filter([$taskRow->user_id, $taskRow->assigned_worker_id]));

        return response()->json(['message' => 'Task deleted.']);
    }

    public function applicants(Request $request, $task)
    {
        $rows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");
        $taskRow = $rows[0] ?? null;

        if (!$taskRow) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        if ($taskRow->user_id != $request->user()->id) {
            return response()->json(['message' => 'You can only view applicants for your own tasks.'], 403);
        }

        $rows = DB::select(
            "SELECT ta.*, u.[id] AS u_id, u.[name] AS u_name, u.[expertise] AS u_expertise, u.[location] AS u_location, u.[phone] AS u_phone
             FROM [task_applications] ta
             LEFT JOIN [users] u ON u.[id] = ta.[user_id]
             WHERE ta.[task_id] = $task
             ORDER BY ta.[created_at] DESC"
        );

        $applicants = array_map(function ($row) {
            $expertise = [];
            if (!empty($row->u_expertise)) {
                $decoded = json_decode($row->u_expertise, true);
                $expertise = is_array($decoded) ? $decoded : [];
            }

            $user = $row->u_id ? (object) [
                'id' => $row->u_id,
                'name' => $row->u_name,
                'expertise' => $expertise,
                'location' => $row->u_location,
                'phone' => $row->u_phone,
            ] : null;

            return (object) [
                'id' => $row->id,
                'task_id' => $row->task_id,
                'user_id' => $row->user_id,
                'message' => $row->message,
                'status' => $row->status,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
                'user' => $user,
            ];
        }, $rows);

        return response()->json($applicants);
    }

    public function advanceProgress(Request $request, $task)
    {
        $userId = $request->user()->id;

        $rows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");
        $taskRow = $rows[0] ?? null;

        if (!$taskRow) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        if ($taskRow->assigned_worker_id != $userId) {
            return response()->json(['message' => 'Only the assigned worker can update progress.'], 403);
        }

        $progressOrder = [
            '',
            'Arriving at the task place',
            'Starting the work',
            'Completing the work',
            'The task is finished',
        ];

        $current = $taskRow->progress ?? '';
        $idx = array_search($current, $progressOrder, true);
        if ($idx === false) {
            $idx = 0;
        }

        if ($idx >= 4) {
            return response()->json(['message' => 'Task already finished.'], 422);
        }

        $next = $progressOrder[$idx + 1];
        $status = $idx + 1 >= 4 ? 'completed' : $taskRow->status;

        DB::update(
            "UPDATE [tasks] SET [progress] = '$next', [status] = '$status', [updated_at] = GETDATE() WHERE [id] = $task"
        );

        // When the worker reaches "Completing the work", open a pending payment.
        if ($next === 'Completing the work') {
            $this->ensurePayment($taskRow);
        }

        if ($status === 'completed' || $next === 'The task is finished') {
            \App\Services\UserStatsService::syncTask((int) $task);
        }

        $rows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");

        return response()->json($rows[0] ?? null);
    }

    /**
     * Create a pending payment row once a task reaches "Completing the work".
     * Safe to call repeatedly: it won't duplicate an existing payment for the task.
     */
    private function ensurePayment($taskRow): void
    {
        $taskId = $taskRow->id;
        $existing = DB::select("SELECT TOP 1 [paymentid] FROM [payments] WHERE [task_id] = $taskId");
        if (!empty($existing)) {
            return;
        }

        $customerId = $taskRow->user_id ?? 'NULL';
        $workerId = $taskRow->assigned_worker_id ?? 'NULL';
        $amount = (float) ($taskRow->budget ?? 0);

        DB::insert(
            "INSERT INTO [payments] ([customer_id], [worker_id], [task_id], [amount], [status], [paymentdate], [created_at], [updated_at])
             VALUES ($customerId, $workerId, $taskId, $amount, 'pending', GETDATE(), GETDATE(), GETDATE())"
        );
    }

    public function completeTask(Request $request, $task)
    {
        $userId = $request->user()->id;

        $rows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");
        $taskRow = $rows[0] ?? null;

        if (!$taskRow) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        if ($taskRow->user_id != $userId) {
            return response()->json(['message' => 'Only the task owner can finalize the task.'], 403);
        }

        DB::update(
            "UPDATE [tasks] SET [progress] = 'The task is finished', [status] = 'completed', [updated_at] = GETDATE() WHERE [id] = $task"
        );

        // The customer releasing payment completes the pending payment.
        DB::update(
            "UPDATE [payments] SET [status] = 'Complete', [updated_at] = GETDATE() WHERE [task_id] = $task AND [status] != 'Complete'"
        );

        \App\Services\UserStatsService::syncTask((int) $task);

        $rows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");

        return response()->json($rows[0] ?? null);
    }

    public function myTasks(Request $request)
    {
        $userId = $request->user()->id;

        $tasks = DB::select(
            "SELECT t.*, (SELECT COUNT(*) FROM [task_applications] ta WHERE ta.[task_id] = t.[id]) AS applications_count,
                    u.[name] AS assigned_worker_name, u.[expertise] AS assigned_worker_expertise, u.[location] AS assigned_worker_location, u.[phone] AS assigned_worker_phone
             FROM [tasks] t
             LEFT JOIN [users] u ON u.[id] = t.[assigned_worker_id]
             WHERE t.[user_id] = $userId
             ORDER BY t.[created_at] DESC"
        );

        return response()->json($tasks);
    }
}
