<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskApplicationController extends Controller
{
    /**
     * List the authenticated worker's own applications, with the related task
     * attached so the dashboard can show its title/budget/status without an
     * extra round trip.
     */
    public function index(Request $request)
    {
        return TaskApplication::where('user_id', $request->user()->id)
            ->with('task')
            ->latest()
            ->get();
    }

    /**
     * Apply to a task as the authenticated worker.
     */
    public function store(Request $request, Task $task)
    {
        $user = $request->user();

        if ($user->role !== 'worker') {
            return response()->json([
                'message' => 'Only worker accounts can apply to tasks.',
            ], 403);
        }

        if (!in_array($task->category, $user->expertise ?? [], true)) {
            return response()->json([
                'message' => 'You can only apply to tasks in your areas of expertise.',
            ], 403);
        }

        if (in_array($task->status, ['assigned', 'completed'], true)) {
            return response()->json([
                'message' => 'This task is no longer accepting applications.',
            ], 422);
        }

        if (TaskApplication::where('task_id', $task->id)->where('user_id', $user->id)->exists()) {
            return response()->json([
                'message' => 'You already applied to this task.',
            ], 409);
        }

        $validated = $request->validate([
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $application = TaskApplication::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'message' => $validated['message'] ?? null,
        ]);

        if ($task->status === 'open') {
            $task->update(['status' => 'matching']);
        }

        return response()->json([
            'application' => $application,
            'task' => $task->fresh(),
        ], 201);
    }

    /**
     * Confirm one applicant as the worker who will complete the task.
     * Declines every other pending application on the same task.
     */
    public function confirm(Request $request, TaskApplication $application)
    {
        $task = $application->task;

        if ($task->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'You can only confirm applicants on your own tasks.',
            ], 403);
        }

        if (in_array($task->status, ['assigned', 'completed'], true)) {
            return response()->json([
                'message' => 'A worker has already been confirmed for this task.',
            ], 422);
        }

        if ($application->status !== 'pending') {
            return response()->json([
                'message' => 'This application is no longer pending.',
            ], 422);
        }

        DB::transaction(function () use ($application, $task) {
            $application->update(['status' => 'accepted']);

            TaskApplication::where('task_id', $task->id)
                ->where('id', '!=', $application->id)
                ->update(['status' => 'declined']);

            $task->update([
                'status' => 'assigned',
                'assigned_worker_id' => $application->user_id,
            ]);
        });

        $task = $task->fresh();
        $task->load('assignedWorker:id,name,expertise,location,phone');

        return response()->json([
            'application' => $application->fresh(),
            'task' => $task,
        ]);
    }
}
