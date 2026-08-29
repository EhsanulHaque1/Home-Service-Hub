<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Admin login credential. Change these before deploying to production.
     */
    private const ADMIN_EMAIL = 'admin@homeservicehub.com';
    private const ADMIN_PASSWORD = 'Admin@1234';
    private const ADMIN_NAME = 'Site Admin';

    public function run(): void
    {
        $existing = DB::select(
            "SELECT [id] FROM [users] WHERE [email] = ?",
            [self::ADMIN_EMAIL]
        );

        if (!empty($existing)) {
            $this->command->info('Admin user already exists: ' . self::ADMIN_EMAIL);
            return;
        }

        $hashed = Hash::make(self::ADMIN_PASSWORD);

        DB::insert(
            "INSERT INTO [users] ([name], [email], [password], [role], [phone], [location], [expertise], [email_verified_at], [created_at], [updated_at])
             VALUES (?, ?, ?, 'admin', NULL, NULL, NULL, GETDATE(), GETDATE(), GETDATE())",
            [self::ADMIN_NAME, self::ADMIN_EMAIL, $hashed]
        );

        $this->command->info('Admin user created: ' . self::ADMIN_EMAIL);
    }
}
