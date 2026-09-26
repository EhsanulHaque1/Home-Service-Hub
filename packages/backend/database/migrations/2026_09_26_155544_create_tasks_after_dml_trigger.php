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
        DB::statement("DROP TRIGGER IF EXISTS trg_tasks_after_dml");

        DB::unprepared("
            CREATE TRIGGER trg_tasks_after_dml 
            ON [tasks]
            AFTER INSERT, UPDATE, DELETE
            AS
            BEGIN
                SET NOCOUNT ON;

                -- Collect all distinct user_id (clients) affected
                DECLARE @AffectedClients TABLE (user_id INT);
                INSERT INTO @AffectedClients (user_id)
                SELECT DISTINCT user_id FROM inserted WHERE user_id IS NOT NULL
                UNION
                SELECT DISTINCT user_id FROM deleted WHERE user_id IS NOT NULL;

                -- Collect all distinct assigned_worker_id (workers) affected
                DECLARE @AffectedWorkers TABLE (worker_id INT);
                INSERT INTO @AffectedWorkers (worker_id)
                SELECT DISTINCT assigned_worker_id FROM inserted WHERE assigned_worker_id IS NOT NULL
                UNION
                SELECT DISTINCT assigned_worker_id FROM deleted WHERE assigned_worker_id IS NOT NULL;

                -- Update users.tasks_given for affected clients
                IF EXISTS (SELECT 1 FROM @AffectedClients)
                BEGIN
                    UPDATE u
                    SET u.tasks_given = (SELECT COUNT(id) FROM tasks WHERE user_id = u.id)
                    FROM users u
                    INNER JOIN @AffectedClients ac ON u.id = ac.user_id;

                    -- Update clients.total_tasks_given and tasks_given
                    UPDATE c
                    SET c.tasks_given = (SELECT COUNT(id) FROM tasks WHERE user_id = c.user_id),
                        c.total_tasks_given = (SELECT COUNT(id) FROM tasks WHERE user_id = c.user_id)
                    FROM clients c
                    INNER JOIN @AffectedClients ac ON c.user_id = ac.user_id;
                END

                -- Update users.tasks_received for affected workers
                IF EXISTS (SELECT 1 FROM @AffectedWorkers)
                BEGIN
                    UPDATE u
                    SET u.tasks_received = (SELECT COUNT(id) FROM tasks WHERE assigned_worker_id = u.id)
                    FROM users u
                    INNER JOIN @AffectedWorkers aw ON u.id = aw.worker_id;

                    -- Update workers.tasks_received
                    UPDATE w
                    SET w.tasks_received = (SELECT COUNT(id) FROM tasks WHERE assigned_worker_id = w.user_id)
                    FROM workers w
                    INNER JOIN @AffectedWorkers aw ON w.user_id = aw.worker_id;
                END
            END;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP TRIGGER IF EXISTS trg_tasks_after_dml");
    }
};
