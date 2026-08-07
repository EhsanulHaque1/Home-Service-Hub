<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MySQL implicitly applies `ON UPDATE CURRENT_TIMESTAMP` to the first
     * TIMESTAMP column. That caused `created_at` to change whenever a message
     * was edited, which reordered the conversation. Convert it to DATETIME so
     * it is only ever set on creation and never auto-updated.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE messages MODIFY created_at DATETIME NULL');
            DB::statement('ALTER TABLE messages MODIFY updated_at DATETIME NULL');
        } else {
            Schema::table('messages', function ($table) {
                $table->datetime('created_at')->change();
                $table->datetime('updated_at')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE messages MODIFY created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
            DB::statement('ALTER TABLE messages MODIFY updated_at TIMESTAMP NULL');
        }
    }
};
