<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::unprepared("DROP PROCEDURE IF EXISTS sp_delete_user_account;");
        
        $procedure = "
            CREATE PROCEDURE sp_delete_user_account
                @user_id bigint
            AS
            BEGIN
                BEGIN TRAN;

                -- 1. Delete task applications made by this user
                DELETE FROM task_applications WHERE user_id = @user_id;

                -- 2. Unassign this user from any assigned tasks
                UPDATE tasks SET assigned_worker_id = NULL WHERE assigned_worker_id = @user_id;

                -- 3. Delete task applications for tasks posted by this user
                DELETE FROM task_applications WHERE task_id IN (SELECT id FROM tasks WHERE user_id = @user_id);

                -- 4. Delete tasks created by this user
                DELETE FROM tasks WHERE user_id = @user_id;

                -- 5. Delete chat messages
                DELETE FROM messages WHERE from_user_id = @user_id OR to_user_id = @user_id;

                -- 6. Delete password resets (using a simple subquery to find the email)
                DELETE FROM password_reset_tokens WHERE email = (SELECT email FROM users WHERE id = @user_id);

                -- 7. Delete sessions
                DELETE FROM sessions WHERE user_id = @user_id;

                -- 8. Delete the user
                DELETE FROM users WHERE id = @user_id;

                COMMIT;
            END
        ";
        
        DB::unprepared($procedure);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared("DROP PROCEDURE IF EXISTS sp_delete_user_account;");
    }
};
