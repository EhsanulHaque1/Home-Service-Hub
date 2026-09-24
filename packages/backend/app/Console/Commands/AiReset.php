<?php

namespace App\Console\Commands;

use App\Models\AiKnowledgeChunk;
use Illuminate\Console\Command;

class AiReset extends Command
{
    protected $signature = 'ai:reset';
    protected $description = 'Delete all ingested knowledge chunks (use before switching embedding providers).';

    public function handle(): int
    {
        $count = AiKnowledgeChunk::query()->delete();
        $this->info("Deleted {$count} knowledge chunk(s).");
        return self::SUCCESS;
    }
}