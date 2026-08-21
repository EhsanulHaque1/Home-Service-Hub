<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    public function conversations(Request $request): JsonResponse
    {
        $userId = Auth::id();

        $rows = DB::select(
            "SELECT m.[id], m.[from_user_id], m.[to_user_id], m.[conversation], m.[created_at],
                    u.[name] AS other_name, u.[role] AS other_role, u.[phone] AS other_phone, latest.other_user_id
             FROM [messages] m
             INNER JOIN (
                 SELECT CASE WHEN [from_user_id] = $userId THEN [to_user_id] ELSE [from_user_id] END AS other_user_id,
                        MAX([id]) AS max_id
                 FROM [messages]
                 WHERE [from_user_id] = $userId OR [to_user_id] = $userId
                 GROUP BY CASE WHEN [from_user_id] = $userId THEN [to_user_id] ELSE [from_user_id] END
             ) latest ON latest.max_id = m.[id]
             LEFT JOIN [users] u ON u.[id] = latest.other_user_id
             ORDER BY m.[created_at] DESC"
        );

        $conversations = array_map(function ($row) {
            return [
                'user' => $row->other_user_id ? [
                    'id' => $row->other_user_id,
                    'name' => $row->other_name,
                    'role' => $row->other_role,
                    'phone' => $row->other_phone,
                ] : null,
                'last_message' => $row->conversation,
                'last_message_at' => $row->created_at,
            ];
        }, $rows);

        return response()->json([
            'conversations' => $conversations,
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $userId = Auth::id();

        $rows = DB::select(
            "SELECT [id], [name], [role], [phone] FROM [users] WHERE [id] != $userId ORDER BY [name]"
        );

        $users = array_map(function ($row) {
            return [
                'id' => $row->id,
                'name' => $row->name,
                'role' => $row->role,
                'phone' => $row->phone,
            ];
        }, $rows);

        return response()->json([
            'users' => $users,
        ]);
    }

    public function messages(Request $request, $user): JsonResponse
    {
        $userId = Auth::id();

        $rows = DB::select(
            "SELECT [id], [from_user_id], [to_user_id], [conversation], [created_at]
             FROM [messages]
             WHERE ([from_user_id] = $userId AND [to_user_id] = $user) OR ([from_user_id] = $user AND [to_user_id] = $userId)
             ORDER BY [created_at] ASC"
        );

        $userRows = DB::select("SELECT [id], [name], [role], [phone] FROM [users] WHERE [id] = $user");
        $other = $userRows[0] ?? null;

        return response()->json([
            'messages' => $rows,
            'user' => $other ? [
                'id' => $other->id,
                'name' => $other->name,
                'role' => $other->role,
                'phone' => $other->phone,
            ] : null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $userId = Auth::id();

        $toUserId = (int) $request->input('to_user_id');
        $conversation = $request->input('conversation');

        DB::insert(
            "INSERT INTO [messages] ([from_user_id], [to_user_id], [conversation], [created_at], [updated_at])
             VALUES ($userId, $toUserId, '$conversation', GETDATE(), GETDATE())"
        );

        $id = DB::getPdo()->lastInsertId();
        $rows = DB::select("SELECT * FROM [messages] WHERE [id] = $id");

        return response()->json([
            'message' => 'Message sent successfully.',
            'data' => $rows[0] ?? null,
        ], 201);
    }

    public function update(Request $request, $message): JsonResponse
    {
        $userId = Auth::id();

        $rows = DB::select("SELECT * FROM [messages] WHERE [id] = $message");
        $msgRow = $rows[0] ?? null;

        if (!$msgRow) {
            return response()->json(['message' => 'Message not found.'], 404);
        }

        if ($msgRow->from_user_id != $userId) {
            return response()->json(['message' => 'You can only edit your own messages.'], 403);
        }

        $conversation = $request->input('conversation');

        DB::update(
            "UPDATE [messages] SET [conversation] = '$conversation', [updated_at] = GETDATE() WHERE [id] = $message"
        );

        $rows = DB::select("SELECT * FROM [messages] WHERE [id] = $message");

        return response()->json([
            'message' => 'Message updated.',
            'data' => $rows[0] ?? null,
        ]);
    }

    public function destroy(Request $request, $message): JsonResponse
    {
        $userId = Auth::id();

        $rows = DB::select("SELECT * FROM [messages] WHERE [id] = $message");
        $msgRow = $rows[0] ?? null;

        if (!$msgRow) {
            return response()->json(['message' => 'Message not found.'], 404);
        }

        if ($msgRow->from_user_id != $userId) {
            return response()->json(['message' => 'You can only delete your own messages.'], 403);
        }

        DB::delete("DELETE FROM [messages] WHERE [id] = $message");

        return response()->json(['message' => 'Message deleted.']);
    }
}
