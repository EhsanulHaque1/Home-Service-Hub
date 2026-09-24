<?php

namespace App\Console\Commands;

use App\Services\RagService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class AiIngest extends Command
{
    protected $signature = 'ai:ingest {--source=* : Specific source file(s) under database/knowledge. Defaults to all.}';
    protected $description = 'Ingest knowledge documents (markdown/text) into the RAG vector store.';

    public function handle(RagService $rag): int
    {
        $dir = database_path('knowledge');
        if (!File::isDirectory($dir)) {
            $this->error("Knowledge directory not found: {$dir}");
            return self::FAILURE;
        }

        $sources = $this->option('source');
        if (empty($sources)) {
            $sources = collect(File::files($dir))
                ->map(fn($f) => $f->getFilename())
                ->all();
        }

        if (empty($sources)) {
            $this->warn('No knowledge files found.');
            return self::SUCCESS;
        }

        $totalChunks = 0;
        foreach ($sources as $name) {
            $path = $dir . DIRECTORY_SEPARATOR . $name;
            if (!File::exists($path)) {
                $this->warn("Missing: {$name}");
                continue;
            }

            $text = File::get($path);
            $chunks = $rag->chunk($text);
            $this->info("Ingesting {$name} (" . count($chunks) . " chunk(s))…");

            foreach ($chunks as $i => $chunk) {
                $rag->ingestChunk($name, $chunk, [
                    'chunk_index' => $i,
                    'total_chunks' => count($chunks),
                ]);
                $totalChunks++;
                $this->line("  chunk {$i}/" . (count($chunks) - 1));
            }
        }

        $this->info("Done. Ingested {$totalChunks} chunk(s) from " . count($sources) . " source(s).");
        return self::SUCCESS;
    }
}