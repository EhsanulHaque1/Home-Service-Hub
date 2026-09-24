<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        Schema::create('ai_knowledge_chunks', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('source', 120)->index();
            $table->text('chunk_text');
            $table->longText('embedding')->nullable(); // JSON array of floats
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // Optional full-text index for keyword fallback on MSSQL
        try {
            DB::statement("CREATE FULLTEXT INDEX IF NOT EXISTS ai_knowledge_chunks_ft ON ai_knowledge_chunks (chunk_text)");
        } catch (\Throwable $e) {
            // FullText may be unavailable in some local SQL Server Express editions; ignore.
        }
    }

    public function down()
    {
        try {
            DB::statement("DROP INDEX IF EXISTS ai_knowledge_chunks_ft ON ai_knowledge_chunks");
        } catch (\Throwable $e) {
            // ignore
        }
        Schema::dropIfExists('ai_knowledge_chunks');
    }
};