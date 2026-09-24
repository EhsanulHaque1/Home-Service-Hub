<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiKnowledgeChunk extends Model
{
    protected $table = 'ai_knowledge_chunks';

    protected $fillable = [
        'source',
        'chunk_text',
        'embedding',
        'metadata',
    ];

    protected $casts = [
        'embedding' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Cosine similarity between this chunk's embedding and a query vector.
     * Returns a value in [-1, 1]; higher is more similar.
     */
    public function cosineSimilarity(array $queryVector): float
    {
        $emb = $this->embedding;
        if (!is_array($emb) || count($emb) === 0 || count($queryVector) === 0) {
            return -1.0;
        }

        $dot = 0.0;
        $normA = 0.0;
        $normB = 0.0;
        $len = min(count($emb), count($queryVector));
        for ($i = 0; $i < $len; $i++) {
            $a = (float) $emb[$i];
            $b = (float) $queryVector[$i];
            $dot += $a * $b;
            $normA += $a * $a;
            $normB += $b * $b;
        }

        $denom = sqrt($normA) * sqrt($normB);
        if ($denom == 0.0) {
            return -1.0;
        }

        return $dot / $denom;
    }
}