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
        DB::statement("DROP VIEW IF EXISTS admin_payments_view");

        DB::statement("
            CREATE VIEW admin_payments_view AS
            SELECT 
                p.paymentid,
                p.customer_id,
                p.worker_id,
                p.task_id,
                p.amount,
                p.status,
                p.paymentdate,
                p.created_at,
                p.updated_at,
                u.name AS customer_name,
                w.name AS worker_name,
                t.title AS task_title
            FROM payments p
            LEFT JOIN users u ON u.id = p.customer_id
            LEFT JOIN users w ON w.id = p.worker_id
            LEFT JOIN tasks t ON t.id = p.task_id
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS admin_payments_view");
    }
};