<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        $user = $request->user();

        $feedbacks = Feedback::where('user_id', $user->id)
            ->latest()
            ->paginate(15);

        return response()->json($feedbacks);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'category' => ['nullable', 'string', 'in:' . implode(',', self::CATEGORIES)],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $feedback = Feedback::create([
            'user_id' => $user->id,
            'category' => $validated['category'] ?? null,
            'message' => $validated['message'],
            'status' => 'open',
        ]);

        return response()->json($feedback, 201);
    }

    public function show(Request $request, Feedback $feedback): JsonResponse
    {
        $user = $request->user();

        if ($feedback->user_id !== $user->id) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        return response()->json($feedback);
    }
}
