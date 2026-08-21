<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskApplicationController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $rows = DB::select(
            "SELECT ta.*, t.[id] AS t_id, t.[title] AS t_title, t.[budget] AS t_budget, t.[status] AS t_status,
                    t.[category] AS t_category, t.[location] AS t_location, t.[user_id] AS t_user_id
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

    public function store(Request $request, $task)
    {
        $user = $request->user();

        if ($user->role !== 'worker') {
            return response()->json([
                'message' => 'Only worker accounts can apply to tasks.',
            ], 403);
        }

        $taskRows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");
        $taskRow = $taskRows[0] ?? null;

        if (!$taskRow) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        $expertise = $user->expertise ?? [];
        if (!in_array($taskRow->category, $expertise, true)) {
            return response()->json([
                'message' => 'You can only apply to tasks in your areas of expertise.',
            ], 403);
        }

        if (in_array($taskRow->status, ['assigned', 'completed'], true)) {
            return response()->json([
                'message' => 'This task is no longer accepting applications.',
            ], 422);
        }

        $existing = DB::select("SELECT COUNT(*) AS c FROM [task_applications] WHERE [task_id] = $task AND [user_id] = $user->id");
        if (($existing[0]->c ?? 0) > 0) {
            return response()->json([
                'message' => 'You already applied to this task.',
            ], 409);
        }

        $message = $request->input('message');

        DB::insert(
            "INSERT INTO [task_applications] ([task_id], [user_id], [message], [status], [created_at], [updated_at])
             VALUES ($task, $user->id, '$message', 'pending', GETDATE(), GETDATE())"
        );

        $appId = DB::getPdo()->lastInsertId();

        if ($taskRow->status === 'open') {
            DB::update("UPDATE [tasks] SET [status] = 'matching', [updated_at] = GETDATE() WHERE [id] = $task");
        }

        $appRows = DB::select("SELECT * FROM [task_applications] WHERE [id] = $appId");
        $taskRows = DB::select("SELECT * FROM [tasks] WHERE [id] = $task");

        return response()->json([
            'application' => $appRows[0] ?? null,
            'task' => $taskRows[0] ?? null,
        ], 201);
    }

    public function confirm(Request $request, $application)
    {
        $appRows = DB::select("SELECT * FROM [task_applications] WHERE [id] = $application");
        $appRow = $appRows[0] ?? null;

        if (!$appRow) {
            return response()->json(['message' => 'Application not found.'], 404);
        }

        $taskRows = DB::select("SELECT * FROM [tasks] WHERE [id] = $appRow->task_id");
        $taskRow = $taskRows[0] ?? null;

        if (!$taskRow) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        if ($taskRow->user_id != $request->user()->id) {
            return response()->json([
                'message' => 'You can only confirm applicants on your own tasks.',
            ], 403);
        }

        if (in_array($taskRow->status, ['assigned', 'completed'], true)) {
            return response()->json([
                'message' => 'A worker has already been confirmed for this task.',
            ], 422);
        }

        if ($appRow->status !== 'pending') {
            return response()->json([
                'message' => 'This application is no longer pending.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            DB::update("UPDATE [task_applications] SET [status] = 'accepted', [updated_at] = GETDATE() WHERE [id] = $application");
            DB::update("UPDATE [task_applications] SET [status] = 'declined', [updated_at] = GETDATE() WHERE [task_id] = $appRow->task_id AND [id] != $application");
            DB::update("UPDATE [tasks] SET [status] = 'assigned', [assigned_worker_id] = $appRow->user_id, [updated_at] = GETDATE() WHERE [id] = $appRow->task_id");
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to confirm application.'], 500);
        }

        $appRows = DB::select("SELECT * FROM [task_applications] WHERE [id] = $application");
        $taskRows = DB::select(
            "SELECT t.*, u.[name] AS assigned_worker_name, u.[expertise] AS assigned_worker_expertise, u.[location] AS assigned_worker_location, u.[phone] AS assigned_worker_phone
             FROM [tasks] t LEFT JOIN [users] u ON u.[id] = t.[assigned_worker_id] WHERE t.[id] = $appRow->task_id"
        );

        return response()->json([
            'application' => $appRows[0] ?? null,
            'task' => $taskRows[0] ?? null,
        ]);
    }
}
