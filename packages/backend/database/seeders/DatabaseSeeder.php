<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Disable all foreign key constraints temporarily
        DB::statement('EXEC sp_MSForEachTable "ALTER TABLE ? NOCHECK CONSTRAINT all"');
        
        // Clear all dummy data from tables (using DELETE instead of TRUNCATE to respect constraints)
        DB::table('payments')->delete();
        DB::table('task_applications')->delete();
        DB::table('messages')->delete();
        DB::table('feedback')->delete();
        DB::table('complaints')->delete();
        DB::table('tasks')->delete();
        DB::table('workers')->delete();
        DB::table('users')->delete();
        
        // Re-enable all foreign key constraints
        DB::statement('EXEC sp_MSForEachTable "ALTER TABLE ? CHECK CONSTRAINT all"');

        $this->command->info('All dummy data cleared successfully!');

        // Create hardcoded admin user
        $adminEmail = 'admin@homeservicehub.com';
        
        // Check if admin already exists
        $existing = DB::select(
            "SELECT [id] FROM [users] WHERE [email] = ?",
            [$adminEmail]
        );

        if (empty($existing)) {
            $hashedPassword = Hash::make('admin');
            
            DB::insert(
                "INSERT INTO [users] ([name], [email], [password], [role], [email_verified_at], [created_at], [updated_at])
                 VALUES (?, ?, ?, ?, GETDATE(), GETDATE(), GETDATE())",
                ['Admin', $adminEmail, $hashedPassword, 'admin']
            );
            
            $this->command->info('Admin user created with email: ' . $adminEmail);
            $this->command->info('Admin username: admin');
            $this->command->info('Admin password: admin');
        } else {
            $this->command->info('Admin user already exists: ' . $adminEmail);
        }
    }
}

