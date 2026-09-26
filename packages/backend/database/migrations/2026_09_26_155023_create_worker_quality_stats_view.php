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
        DB::statement("DROP VIEW IF EXISTS worker_quality_stats_view");
        
        DB::statement("
            CREATE VIEW worker_quality_stats_view AS
            SELECT 
                u.id AS worker_id,
                u.name AS worker_name,
                u.email AS worker_email,
                ISNULL(w.rating, 0) AS rating,
                ISNULL(cj.completed_jobs, 0) AS completed_jobs,
                ISNULL(pe.total_earned, 0) AS total_earned,
                ISNULL(ab.average_task_budget, 0) AS average_task_budget,
                ISNULL(cc.complaints_count, 0) AS complaints_count
            FROM users u
            -- 1. Rating (from workers table)
            LEFT JOIN workers w ON w.user_id = u.id
            
            -- 2. Completed jobs
            LEFT JOIN (
                SELECT assigned_worker_id, COUNT(id) AS completed_jobs 
                FROM tasks 
                WHERE status = 'completed' OR progress = 'The task is finished'
                GROUP BY assigned_worker_id
            ) cj ON u.id = cj.assigned_worker_id
            
            -- 3. Total earned
            LEFT JOIN (
                SELECT worker_id, SUM(amount) AS total_earned 
                FROM payments 
                WHERE status IN ('Complete', 'complete', 'completed', 'successfull', 'successful', 'Paid', 'paid', 'success') 
                GROUP BY worker_id
            ) pe ON u.id = pe.worker_id
            
            -- 4. Average task budget
            LEFT JOIN (
                SELECT assigned_worker_id, AVG(budget) AS average_task_budget 
                FROM tasks 
                GROUP BY assigned_worker_id
            ) ab ON u.id = ab.assigned_worker_id
            
            -- 5. Number of complaints
            LEFT JOIN (
                SELECT worker_email, COUNT(id) AS complaints_count 
                FROM complaints 
                WHERE worker_email IS NOT NULL
                GROUP BY worker_email
            ) cc ON u.email = cc.worker_email
            
            WHERE u.role = 'worker'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS worker_quality_stats_view");
    }
};
