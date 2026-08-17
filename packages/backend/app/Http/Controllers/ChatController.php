<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ChatController extends Controller
{
    public function conversations(Request $request): JsonResponse
    {
        $userId = Auth::id();

        $conversations = Message::where('from_user_id', $userId)
            ->orWhere('to_user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy(function ($message) use ($userId) {
                return $message->from_user_id === $userId ? $message->to_user_id : $message->from_user_id;
            })
            ->map(function ($messages) {
                $lastMessage = $messages->first();
                $otherUserId = $lastMessage->from_user_id === Auth::id() ? $lastMessage->to_user_id : $lastMessage->from_user_id;
                $otherUser = User::find($otherUserId);

                return [
                    'user' => $otherUser ? [
                        'id' => $otherUser->id,
                        'name' => $otherUser->name,
                        'role' => $otherUser->role,
                        'phone' => $otherUser->phone,
                    ] : null,
                    'last_message' => $lastMessage->conversation,
                    'last_message_at' => $lastMessage->created_at,
                ];
            })
            ->values();

        return response()->json([
            'conversations' => $conversations,
        ]);
    }

    /**
     * List users the current user can start a conversation with (excludes self).
     */
    public function users(Request $request): JsonResponse
    {
        $userId = Auth::id();

        $users = User::where('id', '!=', $userId)
            ->orderBy('name')
            ->get(['id', 'name', 'role', 'phone'])
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'phone' => $user->phone,
                ];
            });

        return response()->json([
            'users' => $users,
        ]);
    }

    public function messages(Request $request, User $user): JsonResponse
    {
        $userId = Auth::id();

        $messages = Message::where(function ($query) use ($userId, $user) {
            $query->where('from_user_id', $userId)->where('to_user_id', $user->id);
        })->orWhere(function ($query) use ($userId, $user) {
            $query->where('from_user_id', $user->id)->where('to_user_id', $userId);
        })
            ->orderBy('created_at', 'asc')
            ->get(['id', 'from_user_id', 'to_user_id', 'conversation', 'created_at']);

        return response()->json([
            'messages' => $messages,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
                'phone' => $user->phone,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $userId = Auth::id();

        $validated = $request->validate([
            'to_user_id' => ['required', 'integer', 'exists:users,id', 'not_in:' . $userId],
            'conversation' => ['required', 'string', 'max:2000'],
        ]);

        $message = Message::create([
            'from_user_id' => $userId,
            'to_user_id' => $validated['to_user_id'],
            'conversation' => $validated['conversation'],
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Message sent successfully.',
            'data' => $message,
        ], 201);
    }

    /**
     * Edit a message. Only the original sender may edit it.
     */
    public function update(Request $request, Message $message): JsonResponse
    {
        if ($message->from_user_id !== Auth::id()) {
            return response()->json(['message' => 'You can only edit your own messages.'], 403);
        }

        $validated = $request->validate([
            'conversation' => ['required', 'string', 'max:2000'],
        ]);

        $message->update([
            'conversation' => $validated['conversation'],
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Message updated.',
            'data' => $message,
        ]);
    }

    /**
     * Delete a message. Only the original sender may delete it.
     */
    public function destroy(Request $request, Message $message): JsonResponse
    {
        if ($message->from_user_id !== Auth::id()) {
            return response()->json(['message' => 'You can only delete your own messages.'], 403);
        }

        $message->delete();

        return response()->json(['message' => 'Message deleted.']);
    }
}
