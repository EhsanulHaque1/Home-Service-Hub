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
        DB::statement("DROP VIEW IF EXISTS user_stats_view");
        
        DB::statement("
            CREATE VIEW user_stats_view AS
            SELECT 
                u.id AS user_id,
                u.name,
                u.email,
                u.role,
                ISNULL(tg.tasks_given, 0) AS tasks_given,
                ISNULL(tr.tasks_received, 0) AS tasks_received,
                ISNULL(ps.money_spent, 0) AS money_spent,
                ISNULL(pe.money_earned, 0) AS money_earned
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(id) AS tasks_given 
                FROM tasks 
                GROUP BY user_id
            ) tg ON u.id = tg.user_id
            LEFT JOIN (
                SELECT assigned_worker_id, COUNT(id) AS tasks_received 
                FROM tasks 
                GROUP BY assigned_worker_id
            ) tr ON u.id = tr.assigned_worker_id
            LEFT JOIN (
                SELECT customer_id, SUM(amount) AS money_spent 
                FROM payments 
                WHERE status IN ('Complete', 'complete', 'completed', 'successfull', 'successful', 'Paid', 'paid', 'success') 
                GROUP BY customer_id
            ) ps ON u.id = ps.customer_id
            LEFT JOIN (
                SELECT worker_id, SUM(amount) AS money_earned 
                FROM payments 
                WHERE status IN ('Complete', 'complete', 'completed', 'successfull', 'successful', 'Paid', 'paid', 'success') 
                GROUP BY worker_id
            ) pe ON u.id = pe.worker_id
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS user_stats_view");
    }
};
