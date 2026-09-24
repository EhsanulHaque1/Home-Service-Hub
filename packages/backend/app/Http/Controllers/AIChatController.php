<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use App\Services\RagService;

class AIChatController extends Controller
{
    public function __construct(
        private RagService $rag,
    ) {}

    /**
     * POST /api/ai/chat
     */
    public function chat(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'message' => ['required', 'string', 'max:2000'],
            'session_id' => ['nullable', 'string', 'max:120'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $message = trim($request->input('message'));
        if ($message === '') {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => ['message' => ['The message field is required.']],
            ], 422);
        }

        $result = $this->rag->ask($message);

        return response()->json([
            'answer' => $result['answer'],
            'sources' => $result['sources'],
            'session_id' => $request->input('session_id'),
        ]);
    }
}