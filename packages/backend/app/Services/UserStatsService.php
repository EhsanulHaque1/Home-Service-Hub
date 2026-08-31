<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserStatsService
{
    /**
     * Valid statuses that count as completed payment.
     */
    public const COMPLETED_PAYMENT_STATUSES = [
        'Complete',
        'complete',
        'completed',
        'successfull',
        'successful',
        'Paid',
        'paid',
        'success',
    ];

    /**
     * Build SQL IN clause for payment completed statuses.
     */
    private static function getPaymentStatusCondition(string $prefix = 'p'): string
    {
        $quoted = array_map(function ($s) {
            return "'" . addslashes($s) . "'";
        }, self::COMPLETED_PAYMENT_STATUSES);

        return "($prefix.[status] IN (" . implode(', ', $quoted) . "))";
    }

    /**
     * Synchronize stats for all users, clients, and workers.
     */
    public static function syncAll(): void
    {
        try {
            $paymentCond = self::getPaymentStatusCondition('p');

            // 1. Sync users table
            DB::statement("
                UPDATE u
                SET 
                    u.[tasks_given] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = u.[id]),
                    u.[tasks_received] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = u.[id]),
                    u.[total_spent] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = u.[id] AND $paymentCond),
                    u.[total_earned] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = u.[id] AND $paymentCond)
                FROM [users] u
            ");

            // 2. Ensure all client users exist in clients table
            DB::statement("
                INSERT INTO [clients] ([user_id], [name], [email], [phone], [location], [total_tasks_given], [tasks_given], [total_money_spent], [created_at], [updated_at])
                SELECT 
                    u.[id] AS [user_id],
                    u.[name],
                    u.[email],
                    u.[phone],
                    u.[location],
                    (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = u.[id]),
                    (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = u.[id]),
                    (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = u.[id] AND $paymentCond),
                    u.[created_at],
                    u.[updated_at]
                FROM [users] u
                WHERE (u.[role] = 'client' OR u.[role] = 'customer' OR u.[role] IS NULL OR u.[role] = '')
                  AND NOT EXISTS (SELECT 1 FROM [clients] c WHERE c.[user_id] = u.[id])
            ");

            // 3. Sync clients table
            DB::statement("
                UPDATE c
                SET 
                    c.[name] = ISNULL(u.[name], c.[name]),
                    c.[email] = ISNULL(u.[email], c.[email]),
                    c.[phone] = ISNULL(u.[phone], c.[phone]),
                    c.[location] = ISNULL(u.[location], c.[location]),
                    c.[tasks_given] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = c.[user_id]),
                    c.[total_tasks_given] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = c.[user_id]),
                    c.[total_money_spent] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = c.[user_id] AND $paymentCond)
                FROM [clients] c
                INNER JOIN [users] u ON u.[id] = c.[user_id]
            ");

            // 4. Link workers to users table by email or name if user_id is NULL
            DB::statement("
                UPDATE w
                SET 
                    w.[user_id] = u.[id],
                    w.[email] = ISNULL(w.[email], u.[email]),
                    w.[phone] = ISNULL(w.[phone], u.[phone])
                FROM [workers] w
                INNER JOIN [users] u ON (w.[email] = u.[email] OR (w.[user_id] IS NULL AND w.[name] = u.[name] AND u.[role] = 'worker'))
                WHERE w.[user_id] IS NULL
            ");

            // 5. Ensure all worker users exist in workers table
            DB::statement("
                INSERT INTO [workers] ([user_id], [name], [email], [phone], [trade], [location], [bio], [rating], [jobs_completed], [tasks_received], [total_money_gained], [hourly_rate], [created_at], [updated_at])
                SELECT 
                    u.[id] AS [user_id],
                    u.[name],
                    u.[email],
                    u.[phone],
                    'General',
                    u.[location],
                    '',
                    5.0,
                    (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = u.[id] AND (t.[status] = 'completed' OR t.[progress] = 'The task is finished')),
                    (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = u.[id]),
                    (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = u.[id] AND $paymentCond),
                    25.00,
                    u.[created_at],
                    u.[updated_at]
                FROM [users] u
                WHERE u.[role] = 'worker'
                  AND NOT EXISTS (SELECT 1 FROM [workers] w WHERE w.[user_id] = u.[id] OR (u.[email] IS NOT NULL AND w.[email] = u.[email]))
            ");

            // 6. Sync workers table
            DB::statement("
                UPDATE w
                SET 
                    w.[tasks_received] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = w.[user_id]),
                    w.[jobs_completed] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = w.[user_id] AND (t.[status] = 'completed' OR t.[progress] = 'The task is finished')),
                    w.[total_money_gained] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = w.[user_id] AND $paymentCond)
                FROM [workers] w
                WHERE w.[user_id] IS NOT NULL
            ");
        } catch (\Throwable $e) {
            Log::error('Error in UserStatsService::syncAll: ' . $e->getMessage());
        }
    }

    /**
     * Synchronize stats for specific user(s).
     *
     * @param int|array|null $userIds
     */
    public static function syncUser($userIds): void
    {
        if (empty($userIds)) {
            return;
        }

        if (!is_array($userIds)) {
            $userIds = [$userIds];
        }

        $userIds = array_values(array_filter(array_map('intval', $userIds)));
        if (empty($userIds)) {
            return;
        }

        $idList = implode(',', $userIds);
        $paymentCond = self::getPaymentStatusCondition('p');

        try {
            // Update users table for these user IDs
            DB::statement("
                UPDATE u
                SET 
                    u.[tasks_given] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = u.[id]),
                    u.[tasks_received] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = u.[id]),
                    u.[total_spent] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = u.[id] AND $paymentCond),
                    u.[total_earned] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = u.[id] AND $paymentCond)
                FROM [users] u
                WHERE u.[id] IN ($idList)
            ");

            // Sync clients table if any of these users are clients
            DB::statement("
                UPDATE c
                SET 
                    c.[tasks_given] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = c.[user_id]),
                    c.[total_tasks_given] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = c.[user_id]),
                    c.[total_money_spent] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = c.[user_id] AND $paymentCond)
                FROM [clients] c
                WHERE c.[user_id] IN ($idList)
            ");

            // Sync workers table if any of these users are workers
            DB::statement("
                UPDATE w
                SET 
                    w.[tasks_received] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = w.[user_id]),
                    w.[jobs_completed] = (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = w.[user_id] AND (t.[status] = 'completed' OR t.[progress] = 'The task is finished')),
                    w.[total_money_gained] = (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = w.[user_id] AND $paymentCond)
                FROM [workers] w
                WHERE w.[user_id] IN ($idList)
            ");
        } catch (\Throwable $e) {
            Log::error('Error in UserStatsService::syncUser: ' . $e->getMessage());
        }
    }

    /**
     * Synchronize stats for users involved in a specific task.
     */
    public static function syncTask(int $taskId): void
    {
        try {
            $rows = DB::select("SELECT [user_id], [assigned_worker_id] FROM [tasks] WHERE [id] = $taskId");
            if (!empty($rows)) {
                $userIds = array_filter([$rows[0]->user_id, $rows[0]->assigned_worker_id]);
                self::syncUser($userIds);
            }
        } catch (\Throwable $e) {
            Log::error('Error in UserStatsService::syncTask: ' . $e->getMessage());
        }
    }
}
