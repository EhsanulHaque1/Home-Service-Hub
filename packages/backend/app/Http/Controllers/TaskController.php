<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $query = Task::query()->latest();

        if ($request->filled('category')) {
            // Accepts either a single category or a comma-separated list (used by
            // workers browsing every category they have expertise in at once).
            $categories = array_filter(explode(',', (string) $request->string('category')));
            $query->whereIn('category', $categories);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return $query->paginate(15);
    }

    public function show(Task $task)
    {
        return $task;
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->taskRules());

        // Attach the task to the signed-in client so it shows up on their dashboard.
        // Posting still works for guests, who just won't have a "my tasks" view.
        $validated['user_id'] = $request->user()?->id;

        $task = Task::create($validated);

        return response()->json($task, 201);
    }

    /**
     * Update a task's own details. Only the client who posted it may edit it,
     * and only before a worker has been confirmed for it.
     */
    public function update(Request $request, Task $task)
    {
        if ($task->user_id !== $request->user()->id) {
            return response()->json(['message' => 'You can only edit your own tasks.'], 403);
        }

        if (in_array($task->status, ['assigned', 'completed'], true)) {
            return response()->json(['message' => 'This task can no longer be edited.'], 422);
        }

        $validated = $request->validate($this->taskRules());

        $task->update($validated);

        return $task->fresh();
    }

    /**
     * Delete a task. Only the owning client may delete it, and only before a
     * worker has been confirmed for it.
     */
    public function destroy(Request $request, Task $task)
    {
        if ($task->user_id !== $request->user()->id) {
            return response()->json(['message' => 'You can only delete your own tasks.'], 403);
        }

        if (in_array($task->status, ['assigned', 'completed'], true)) {
            return response()->json(['message' => 'This task can no longer be deleted.'], 422);
        }

        $task->delete();

        return response()->json(['message' => 'Task deleted.']);
    }

    /**
     * List the applicants for one of the authenticated client's own tasks.
     */
    public function applicants(Request $request, Task $task)
    {
        if ($task->user_id !== $request->user()->id) {
            return response()->json(['message' => 'You can only view applicants for your own tasks.'], 403);
        }

        return $task->applications()
            ->with('user:id,name,expertise,location,phone')
            ->latest()
            ->get();
    }

    /**
     * Tasks posted by the authenticated client, with how many workers applied to each.
     */
    public function myTasks(Request $request)
    {
        return Task::where('user_id', $request->user()->id)
            ->withCount('applications')
            ->with('assignedWorker:id,name,expertise,location,phone')
            ->latest()
            ->get();
    }

    private function taskRules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'min:10', 'max:2000'],
            'category' => ['required', 'string', 'in:' . implode(',', Task::CATEGORIES)],
            'budget' => ['required', 'numeric', 'min:1', 'max:100000'],
            'location' => ['required', 'string', 'max:255'],
            'client_name' => ['required', 'string', 'max:255'],
            'client_email' => ['required', 'email', 'max:255'],
        ];
    }
}
