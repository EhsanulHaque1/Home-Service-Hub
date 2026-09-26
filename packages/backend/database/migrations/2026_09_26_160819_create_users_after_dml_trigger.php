<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("DROP TRIGGER IF EXISTS trg_users_after_dml");

        DB::unprepared("
            CREATE TRIGGER trg_users_after_dml
            ON [users]
            AFTER INSERT, UPDATE
            AS
            BEGIN
                SET NOCOUNT ON;

                -- 1. AFTER INSERT logic: Insert into clients or workers
                -- For clients
                INSERT INTO [clients] ([user_id], [name], [email], [phone], [location], [created_at], [updated_at])
                SELECT i.[id], i.[name], i.[email], i.[phone], i.[location], i.[created_at], i.[updated_at]
                FROM inserted i
                LEFT JOIN deleted d ON d.[id] = i.[id]
                WHERE d.[id] IS NULL 
                  AND (i.[role] = 'client' OR i.[role] = 'customer' OR i.[role] IS NULL OR i.[role] = '')
                  AND NOT EXISTS (SELECT 1 FROM [clients] c WHERE c.[user_id] = i.[id]);

                -- For workers
                INSERT INTO [workers] ([user_id], [name], [email], [phone], [location], [trade], [rating], [hourly_rate], [created_at], [updated_at])
                SELECT i.[id], i.[name], i.[email], i.[phone], i.[location], 'General', 5.0, 25.00, i.[created_at], i.[updated_at]
                FROM inserted i
                LEFT JOIN deleted d ON d.[id] = i.[id]
                WHERE d.[id] IS NULL 
                  AND i.[role] = 'worker'
                  AND NOT EXISTS (SELECT 1 FROM [workers] w WHERE w.[user_id] = i.[id]);

                -- 2. AFTER UPDATE logic: Sync basic fields
                -- For clients
                UPDATE c
                SET 
                    c.[name] = i.[name],
                    c.[email] = i.[email],
                    c.[phone] = i.[phone],
                    c.[location] = i.[location],
                    c.[updated_at] = i.[updated_at]
                FROM [clients] c
                INNER JOIN inserted i ON c.[user_id] = i.[id]
                INNER JOIN deleted d ON d.[id] = i.[id]
                WHERE i.[name] != d.[name] OR ISNULL(i.[email], '') != ISNULL(d.[email], '') 
                   OR ISNULL(i.[phone], '') != ISNULL(d.[phone], '') OR ISNULL(i.[location], '') != ISNULL(d.[location], '');

                -- For workers
                UPDATE w
                SET 
                    w.[name] = i.[name],
                    w.[email] = i.[email],
                    w.[phone] = i.[phone],
                    w.[location] = i.[location],
                    w.[updated_at] = i.[updated_at]
                FROM [workers] w
                INNER JOIN inserted i ON w.[user_id] = i.[id]
                INNER JOIN deleted d ON d.[id] = i.[id]
                WHERE i.[name] != d.[name] OR ISNULL(i.[email], '') != ISNULL(d.[email], '') 
                   OR ISNULL(i.[phone], '') != ISNULL(d.[phone], '') OR ISNULL(i.[location], '') != ISNULL(d.[location], '');
            END;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP TRIGGER IF EXISTS trg_users_after_dml");
    }
};
