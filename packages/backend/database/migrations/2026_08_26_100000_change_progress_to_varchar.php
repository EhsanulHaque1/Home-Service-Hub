<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Drop the previous integer default constraint.
        DB::statement("
            DECLARE @sql NVARCHAR(MAX);
            SELECT @sql = 'ALTER TABLE [tasks] DROP CONSTRAINT ' + dc.name
            FROM sys.default_constraints dc
            JOIN sys.columns c
              ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
            WHERE dc.parent_object_id = OBJECT_ID('tasks') AND c.name = 'progress';
            IF @sql IS NOT NULL EXEC(@sql);
        ");

        // Change the column type first so the values can be stored as strings.
        DB::statement("ALTER TABLE [tasks] ALTER COLUMN [progress] NVARCHAR(255) NULL");

        // Convert existing integer values into their label equivalents.
        DB::statement("
            UPDATE [tasks] SET [progress] = CASE [progress]
                WHEN 1 THEN 'Arriving at the task place'
                WHEN 2 THEN 'Starting the work'
                WHEN 3 THEN 'Completing the work'
                WHEN 4 THEN 'The task is finished'
                ELSE '' END
        ");
    }

    public function down(): void
    {
        DB::statement("
            DECLARE @sql NVARCHAR(MAX);
            SELECT @sql = 'ALTER TABLE [tasks] DROP CONSTRAINT ' + dc.name
            FROM sys.default_constraints dc
            JOIN sys.columns c
              ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
            WHERE dc.parent_object_id = OBJECT_ID('tasks') AND c.name = 'progress';
            IF @sql IS NOT NULL EXEC(@sql);
        ");

        DB::statement("UPDATE [tasks] SET [progress] = 0");
        DB::statement("ALTER TABLE [tasks] ALTER COLUMN [progress] INT NOT NULL");
    }
};
