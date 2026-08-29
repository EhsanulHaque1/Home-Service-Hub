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
        // Re-runnable: clear any table left behind by a previously failed run.
        DB::statement("IF OBJECT_ID('dbo.payments', 'U') IS NOT NULL DROP TABLE dbo.payments;");

        DB::statement(
            "CREATE TABLE [payments] (
                [paymentid] BIGINT IDENTITY(1,1) PRIMARY KEY,
                [customer_id] BIGINT NOT NULL,
                [worker_id] BIGINT NOT NULL,
                [task_id] BIGINT NOT NULL,
                [amount] DECIMAL(10,2) NOT NULL,
                [status] NVARCHAR(255) NOT NULL DEFAULT 'pending',
                [paymentdate] DATETIME NULL,
                [created_at] DATETIME NULL,
                [updated_at] DATETIME NULL,
                CONSTRAINT [fk_payments_customer] FOREIGN KEY ([customer_id]) REFERENCES [users]([id]) ON DELETE NO ACTION,
                CONSTRAINT [fk_payments_worker] FOREIGN KEY ([worker_id]) REFERENCES [users]([id]) ON DELETE NO ACTION,
                CONSTRAINT [fk_payments_task] FOREIGN KEY ([task_id]) REFERENCES [tasks]([id]) ON DELETE NO ACTION
            )"
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("IF OBJECT_ID('dbo.payments', 'U') IS NOT NULL DROP TABLE dbo.payments;");
    }
};
