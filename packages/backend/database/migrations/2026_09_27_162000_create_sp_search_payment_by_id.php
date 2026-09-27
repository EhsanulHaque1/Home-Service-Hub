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
        DB::statement("DROP PROCEDURE IF EXISTS sp_search_payment_by_id");

        DB::statement("
            CREATE PROCEDURE sp_search_payment_by_id
                @payment_id INT
            AS
            BEGIN
                SET NOCOUNT ON;

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
                WHERE p.paymentid = @payment_id
                ORDER BY p.paymentdate DESC;
            END;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP PROCEDURE IF EXISTS sp_search_payment_by_id");
    }
};