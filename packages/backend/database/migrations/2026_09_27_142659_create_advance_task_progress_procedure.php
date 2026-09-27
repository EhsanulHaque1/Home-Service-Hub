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
        DB::statement("DROP PROCEDURE IF EXISTS sp_advance_task_progress");

        DB::statement("
            CREATE PROCEDURE sp_advance_task_progress
                @taskId INT,
                @workerId INT
            AS
            BEGIN
                SET NOCOUNT ON;

                DECLARE @progressOrder TABLE (
                    idx INT IDENTITY(0,1),
                    label NVARCHAR(100)
                );

                INSERT INTO @progressOrder (label) VALUES
                    (''), -- 0: Not started
                    ('Arriving at the task place'), -- 1
                    ('Starting the work'), -- 2
                    ('Completing the work'), -- 3
                    ('The task is finished'); -- 4

                DECLARE @currentProgress NVARCHAR(100);
                DECLARE @currentIdx INT;
                DECLARE @nextProgress NVARCHAR(100);
                DECLARE @nextIdx INT;
                DECLARE @newStatus NVARCHAR(50);

                -- Get current progress and verify worker assignment
                SELECT 
                    @currentProgress = ISNULL(t.[progress], ''),
                    @currentIdx = CASE 
                        WHEN ISNULL(t.[progress], '') = '' THEN 0
                        WHEN t.[progress] = 'Arriving at the task place' THEN 1
                        WHEN t.[progress] = 'Starting the work' THEN 2
                        WHEN t.[progress] = 'Completing the work' THEN 3
                        WHEN t.[progress] = 'The task is finished' THEN 4
                        ELSE 0
                    END
                FROM [tasks] t
                WHERE t.[id] = @taskId AND t.[assigned_worker_id] = @workerId;

                IF @@ROWCOUNT = 0
                BEGIN
                    -- Task not found or worker not assigned
                    SELECT -1 AS result, 'Task not found or unauthorized.' AS message;
                    RETURN;
                END

                IF @currentIdx >= 4
                BEGIN
                    -- Already finished
                    SELECT 0 AS result, 'Task already finished.' AS message;
                    RETURN;
                END

                -- Calculate next progress
                SET @nextIdx = @currentIdx + 1;
                SELECT @nextProgress = label FROM @progressOrder WHERE idx = @nextIdx;

                -- Determine new status
                SET @newStatus = CASE 
                    WHEN @nextIdx >= 4 THEN 'completed'
                    ELSE (SELECT [status] FROM [tasks] WHERE [id] = @taskId)
                END;

                -- Update task progress
                UPDATE [tasks]
                SET 
                    [progress] = @nextProgress,
                    [status] = @newStatus,
                    [updated_at] = GETDATE()
                WHERE [id] = @taskId;

                -- Create pending payment when reaching 'Completing the work'
                IF @nextProgress = 'Completing the work'
                BEGIN
                    DECLARE @customerId INT, @amount DECIMAL(10,2);
                    
                    SELECT @customerId = [user_id], @amount = ISNULL([budget], 0)
                    FROM [tasks] WHERE [id] = @taskId;

                    IF NOT EXISTS (SELECT 1 FROM [payments] WHERE [task_id] = @taskId)
                    BEGIN
                        INSERT INTO [payments] ([customer_id], [worker_id], [task_id], [amount], [status], [paymentdate], [created_at], [updated_at])
                        VALUES (@customerId, @workerId, @taskId, @amount, 'pending', GETDATE(), GETDATE(), GETDATE());
                    END
                END

                -- Return updated task
                SELECT 
                    t.[id], t.[title], t.[progress], t.[status], t.[updated_at],
                    1 AS result, 'Progress advanced.' AS message
                FROM [tasks] t
                WHERE t.[id] = @taskId;
            END;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP PROCEDURE IF EXISTS sp_advance_task_progress");
    }
};