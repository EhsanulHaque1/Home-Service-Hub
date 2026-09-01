<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('task_assignments')) {
            Schema::create('task_assignments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
                $table->foreignId('client_user_id')->constrained('users');
                $table->foreignId('worker_user_id')->constrained('users');
                $table->string('status', 50)->default('assigned');
                $table->decimal('agreed_price', 10, 2)->nullable();
                $table->timestamp('assigned_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
            });

            // Populate existing assignments from tasks table
            DB::statement("
                INSERT INTO [task_assignments] ([task_id], [client_user_id], [worker_user_id], [status], [agreed_price], [assigned_at], [created_at], [updated_at])
                SELECT 
                    t.[id] AS [task_id],
                    t.[user_id] AS [client_user_id],
                    t.[assigned_worker_id] AS [worker_user_id],
                    ISNULL(t.[status], 'assigned') AS [status],
                    t.[budget] AS [agreed_price],
                    t.[created_at] AS [assigned_at],
                    t.[created_at],
                    t.[updated_at]
                FROM [tasks] t
                WHERE t.[user_id] IS NOT NULL 
                  AND t.[assigned_worker_id] IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM [task_assignments] ta 
                      WHERE ta.[task_id] = t.[id] AND ta.[worker_user_id] = t.[assigned_worker_id]
                  )
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_assignments');
    }
};
