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
        if (!Schema::hasTable('clients')) {
            Schema::create('clients', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('name');
                $table->string('email')->nullable();
                $table->string('phone')->nullable();
                $table->string('location')->nullable();
                $table->unsignedInteger('total_tasks_given')->default(0);
                $table->decimal('total_money_spent', 10, 2)->default(0);
                $table->timestamps();
            });
        }

        // Add email, phone, and total_money_gained to workers table if missing
        if (Schema::hasTable('workers')) {
            Schema::table('workers', function (Blueprint $table) {
                if (!Schema::hasColumn('workers', 'user_id')) {
                    $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                }
                if (!Schema::hasColumn('workers', 'email')) {
                    $table->string('email')->nullable();
                }
                if (!Schema::hasColumn('workers', 'phone')) {
                    $table->string('phone')->nullable();
                }
                if (!Schema::hasColumn('workers', 'total_money_gained')) {
                    $table->decimal('total_money_gained', 10, 2)->default(0);
                }
            });
        }

        // Sync existing clients from users table into clients table
        DB::statement("
            INSERT INTO [clients] ([user_id], [name], [email], [phone], [location], [total_tasks_given], [total_money_spent], [created_at], [updated_at])
            SELECT 
                u.[id] AS [user_id],
                u.[name],
                u.[email],
                u.[phone],
                u.[location],
                (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = u.[id]) AS [total_tasks_given],
                (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'Paid')) AS [total_money_spent],
                u.[created_at],
                u.[updated_at]
            FROM [users] u
            WHERE (u.[role] = 'client' OR u.[role] = 'customer' OR u.[role] IS NULL)
              AND NOT EXISTS (SELECT 1 FROM [clients] c WHERE c.[user_id] = u.[id])
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
