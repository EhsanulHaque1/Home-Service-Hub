<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use stdClass;

class ChatController extends Controller
{
    /**
     * Result codes returned by the chat stored procedures.
     */
    private const RESULT_NOT_FOUND = -1;

    private const RESULT_FORBIDDEN = -2;

    private const RESULT_OK = 1;

    /**
     * Conversation list, read from the vw_chat_conversations view.
     */
    public function conversations(Request $request): JsonResponse
    {
        $userId = (int) Auth::id();

        $rows = DB::select(
            'SELECT other_user.[id], other_user.[name], other_user.[role], other_user.[phone],
                    v.[last_message], v.[last_message_at]
             FROM [dbo].[vw_chat_conversations] v
             INNER JOIN [dbo].[users] other_user
                ON other_user.[id] = CASE WHEN v.[user_a] = ? THEN v.[user_b] ELSE v.[user_a] END
             WHERE v.[user_a] = ? OR v.[user_b] = ?
             ORDER BY v.[last_message_at] DESC',
            [$userId, $userId, $userId]
        );

        $conversations = array_map(function ($row) {
            return [
                'user' => [
                    'id' => $row->id,
                    'name' => $row->name,
                    'role' => $row->role,
                    'phone' => $row->phone,
                ],
                'last_message' => $row->last_message,
                'last_message_at' => $row->last_message_at,
            ];
        }, $rows);

        return response()->json([
            'conversations' => $conversations,
        ]);
    }

    /**
     * People the current user can start a conversation with.
     */
    public function users(Request $request): JsonResponse
    {
        $userId = (int) Auth::id();

        $rows = DB::select(
            'SELECT [id], [name], [role], [phone] FROM [dbo].[users] WHERE [id] != ? ORDER BY [name]',
            [$userId]
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

    /**
     * A single thread, read from the vw_chat_messages view.
     */
    public function messages(Request $request, $user): JsonResponse
    {
        $userId = (int) Auth::id();
        $otherUserId = (int) $user;

        $rows = DB::select(
            'SELECT [id], [from_user_id], [to_user_id], [conversation], [created_at]
             FROM [dbo].[vw_chat_messages]
             WHERE ([from_user_id] = ? AND [to_user_id] = ?)
                OR ([from_user_id] = ? AND [to_user_id] = ?)
             ORDER BY [created_at] ASC',
            [$userId, $otherUserId, $otherUserId, $userId]
        );

        $userRows = DB::select(
            'SELECT [id], [name], [role], [phone] FROM [dbo].[users] WHERE [id] = ?',
            [$otherUserId]
        );
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

    /**
     * Send a message through sp_create_chat_message.
     */
    public function store(Request $request): JsonResponse
    {
        $rows = DB::select(
            'EXEC [dbo].[sp_create_chat_message] @fromUserId = ?, @toUserId = ?, @conversation = ?',
            [
                (int) Auth::id(),
                (int) $request->input('to_user_id'),
                $this->messageBody($request),
            ]
        );

        $row = $rows[0] ?? null;

        if (! $row || (int) $row->result !== self::RESULT_OK) {
            return response()->json(['message' => $row->message ?? 'Message could not be sent.'], 422);
        }

        return response()->json([
            'message' => $row->message,
            'data' => $this->messagePayload($row),
        ], 201);
    }

    /**
     * Edit a message through sp_update_chat_message.
     */
    public function update(Request $request, $message): JsonResponse
    {
        $rows = DB::select(
            'EXEC [dbo].[sp_update_chat_message] @messageId = ?, @userId = ?, @conversation = ?',
            [
                (int) $message,
                (int) Auth::id(),
                $this->messageBody($request),
            ]
        );

        $row = $rows[0] ?? null;

        if (! $row) {
            return response()->json(['message' => 'Message not found.'], 404);
        }

        $status = match ((int) $row->result) {
            self::RESULT_NOT_FOUND => 404,
            self::RESULT_FORBIDDEN => 403,
            self::RESULT_OK => 200,
            default => 422,
        };

        if ($status !== 200) {
            return response()->json(['message' => $row->message], $status);
        }

        return response()->json([
            'message' => $row->message,
            'data' => $this->messagePayload($row),
        ]);
    }

    /**
     * Delete a message through sp_delete_chat_message.
     */
    public function destroy(Request $request, $message): JsonResponse
    {
        $rows = DB::select(
            'EXEC [dbo].[sp_delete_chat_message] @messageId = ?, @userId = ?',
            [(int) $message, (int) Auth::id()]
        );

        $row = $rows[0] ?? null;

        if (! $row) {
            return response()->json(['message' => 'Message not found.'], 404);
        }

        $status = match ((int) $row->result) {
            self::RESULT_NOT_FOUND => 404,
            self::RESULT_FORBIDDEN => 403,
            self::RESULT_OK => 200,
            default => 422,
        };

        return response()->json(['message' => $row->message], $status);
    }

    /**
     * Read the message body as a plain string so the procedure always receives
     * something it can bind, whatever the client sent.
     */
    private function messageBody(Request $request): string
    {
        $body = $request->input('conversation');

        if (is_string($body)) {
            return $body;
        }

        return is_scalar($body) ? (string) $body : '';
    }

    /**
     * Strip the procedure status columns from a message row.
     */
    private function messagePayload(stdClass $row): object
    {
        $data = clone $row;
        unset($data->result, $data->message);

        return $data;
    }
}
