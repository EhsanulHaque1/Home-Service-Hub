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
        // 1. Add tracking columns to users table
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'tasks_given')) {
                $table->unsignedInteger('tasks_given')->default(0)->after('location');
            }
            if (!Schema::hasColumn('users', 'tasks_received')) {
                $table->unsignedInteger('tasks_received')->default(0)->after('tasks_given');
            }
            if (!Schema::hasColumn('users', 'total_spent')) {
                $table->decimal('total_spent', 10, 2)->default(0)->after('tasks_received');
            }
            if (!Schema::hasColumn('users', 'total_earned')) {
                $table->decimal('total_earned', 10, 2)->default(0)->after('total_spent');
            }
        });

        // 2. Add tracking columns to workers table
        Schema::table('workers', function (Blueprint $table) {
            if (!Schema::hasColumn('workers', 'tasks_received')) {
                $table->unsignedInteger('tasks_received')->default(0)->after('jobs_completed');
            }
        });

        // 3. Add tasks_given to clients table if missing
        Schema::table('clients', function (Blueprint $table) {
            if (!Schema::hasColumn('clients', 'tasks_given')) {
                $table->unsignedInteger('tasks_given')->default(0)->after('location');
            }
        });

        // 4. Update initial counts from existing database data
        DB::statement("
            UPDATE u
            SET 
                u.[tasks_given] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = u.[id]),
                u.[tasks_received] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = u.[id]),
                u.[total_spent] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'Paid')),
                u.[total_earned] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'Paid'))
            FROM [users] u
        ");

        DB::statement("
            UPDATE c
            SET 
                c.[tasks_given] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = c.[user_id]),
                c.[total_tasks_given] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = c.[user_id]),
                c.[total_money_spent] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = c.[user_id] AND (p.[status] = 'Complete' OR p.[status] = 'Paid'))
            FROM [clients] c
        ");

        DB::statement("
            UPDATE w
            SET 
                w.[tasks_received] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = w.[user_id]),
                w.[total_money_gained] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = w.[user_id] AND (p.[status] = 'Complete' OR p.[status] = 'Paid'))
            FROM [workers] w
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['tasks_given', 'tasks_received', 'total_spent', 'total_earned']);
        });

        Schema::table('workers', function (Blueprint $table) {
            $table->dropColumn('tasks_received');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('tasks_given');
        });
    }
};
