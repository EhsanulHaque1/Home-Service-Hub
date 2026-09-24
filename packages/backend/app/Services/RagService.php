<?php

namespace App\Services;

use App\Models\AiKnowledgeChunk;
use Illuminate\Support\Facades\Http;

class RagService
{
    private const TOP_K = 5;

    private string $apiKey;
    private string $embedModel;
    private string $chatModel;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = (string) config('gemini.api_key', '');
        $this->embedModel = (string) config('gemini.embed_model', 'text-embedding-004');
        $this->chatModel = (string) config('gemini.chat_model', 'gemini-2.0-flash');
        $this->baseUrl = rtrim((string) config('gemini.base_url', 'https://generativelanguage.googleapis.com/v1beta'), '/');
    }

    /**
     * Gemini embedContent endpoint.
     * Body: { "model": "models/gemini-embedding-001", "content": { "parts": [ {"text": "..."} ] } }
     * Response: { "embedding": { "values": [...] } }
     */
    public function embed(string $text): array
    {
        $res = Http::withOptions(['query' => ['key' => $this->apiKey]])
            ->timeout(60)
            ->post("{$this->baseUrl}/models/{$this->embedModel}:embedContent", [
                'model' => "models/{$this->embedModel}",
                'content' => [
                    'parts' => [['text' => $text]],
                ],
            ])
            ->throw()
            ->json();

        return (array) ($res['embedding']['values'] ?? []);
    }

    /**
     * Ingest a single chunk: store it with its embedding.
     */
    public function ingestChunk(string $source, string $chunkText, array $metadata = []): AiKnowledgeChunk
    {
        $embedding = $this->embed($chunkText);

        return AiKnowledgeChunk::create([
            'source' => $source,
            'chunk_text' => $chunkText,
            'embedding' => $embedding,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Retrieve the most relevant chunks for a question.
     *
     * @return array<int, array{chunk_text:string, source:string, score:float, metadata:array}>
     */
    public function retrieve(string $question, int $topK = self::TOP_K): array
    {
        $queryVector = $this->embed($question);
        if (empty($queryVector)) {
            return [];
        }

        $chunks = AiKnowledgeChunk::whereNotNull('embedding')->get();

        $scored = [];
        foreach ($chunks as $chunk) {
            $score = $chunk->cosineSimilarity($queryVector);
            if ($score > 0) {
                $scored[] = [
                    'chunk_text' => $chunk->chunk_text,
                    'source' => $chunk->source,
                    'score' => $score,
                    'metadata' => $chunk->metadata ?? [],
                ];
            }
        }

        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);

        return array_slice($scored, 0, $topK);
    }

    /**
     * Build an augmented prompt from the user question and retrieved chunks.
     */
    public function buildPrompt(string $question, array $retrieved): string
    {
        $context = collect($retrieved)
            ->map(fn($r) => "- [{$r['source']}] {$r['chunk_text']}")
            ->implode("\n");

        $context = $context !== '' ? $context : '(No relevant context found.)';

        return <<<PROMPT
You are the HomeServiceHub AI assistant. Answer the user's question using ONLY the retrieved context below. Do not invent information that is not present in the context. If the context does not contain the answer, say so politely and offer to help with what you do know.

=== RETRIEVED CONTEXT ===
{$context}
=== END CONTEXT ===

USER QUESTION:
{$question}

Answer concisely and helpfully.
PROMPT;
    }

    /**
     * Gemini generateContent endpoint.
     * Body: { "contents": [ {"role":"user","parts":[{"text":"..."}]} ], "generationConfig": {...} }
     * Response: { "candidates": [ {"content": {"parts":[{"text":"..."}]} } ] }
     */
    public function generate(string $augmentedPrompt): string
    {
        $res = Http::withOptions(['query' => ['key' => $this->apiKey]])
            ->timeout(90)
            ->post("{$this->baseUrl}/models/{$this->chatModel}:generateContent", [
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $augmentedPrompt]]],
                ],
                'generationConfig' => [
                    'temperature' => 0.3,
                ],
            ])
            ->throw()
            ->json();

        return trim((string) ($res['candidates'][0]['content']['parts'][0]['text'] ?? ''));
    }

    /**
     * Split text into overlapping chunks suitable for embedding.
     */
    public function chunk(string $text, int $chunkSize = 600, int $overlap = 80): array
    {
        $text = preg_replace('/\s+/', ' ', trim($text));
        if (strlen($text) <= $chunkSize) {
            return [$text];
        }

        $chunks = [];
        $start = 0;
        while ($start < strlen($text)) {
            $end = min($start + $chunkSize, strlen($text));
            // Try to break on a sentence boundary.
            if ($end < strlen($text)) {
                $boundary = strrpos($text, '. ', $end - min($end, 120));
                if ($boundary !== false && $boundary > $start) {
                    $end = $boundary + 1;
                }
            }
            $chunks[] = trim(substr($text, $start, $end - $start));
            $start = $end - $overlap;
            if ($end >= strlen($text)) {
                break;
            }
        }

        return array_values(array_filter($chunks, fn($c) => trim($c) !== ''));
    }

    /**
     * Full RAG pipeline for a single question.
     *
     * @return array{answer:string, sources:array}
     */
    public function ask(string $question): array
    {
        $retrieved = $this->retrieve($question);
        $prompt = $this->buildPrompt($question, $retrieved);
        $answer = $this->generate($prompt);

        $sources = collect($retrieved)->map(fn($r) => [
            'source' => $r['source'],
            'score' => round($r['score'], 4),
        ])->values()->all();

        return [
            'answer' => $answer,
            'sources' => $sources,
            'retrieved' => $retrieved,
        ];
    }
}