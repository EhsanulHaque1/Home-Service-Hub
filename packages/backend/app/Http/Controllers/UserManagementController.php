<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserManagementController extends Controller
{
    /**
     * Get All Users (Total User Table) with subquery columns for spent, earned, and task counts
     */
    public function allUsers(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rank = $request->query('rank');
        $allowed = ['none', '1st', '2nd', '3rd'];
        if (!in_array($rank, $allowed, true)) {
            $rank = 'none';
        }

        $top = '';
        $where = "WHERE 1=1";

        if ($rank === '1st') {
            $top = 'TOP 1';
        } elseif ($rank === '2nd') {
            $top = 'TOP 1';
            $where .= " AND u.[id] < (SELECT TOP 1 [id] FROM [users] ORDER BY [id] DESC)";
        } elseif ($rank === '3rd') {
            $top = 'TOP 1';
            $where .= " AND u.[id] < (SELECT TOP 1 [id] FROM [users] WHERE [id] < (SELECT TOP 1 [id] FROM [users] ORDER BY [id] DESC) ORDER BY [id] DESC)";
        }

        $rows = DB::select(
            "SELECT $top 
                u.[id], 
                u.[name], 
                u.[email], 
                u.[phone], 
                u.[location], 
                ISNULL(u.[role], 'client') AS [role], 
                u.[expertise], 
                u.[created_at],
                (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'successfull' OR p.[status] = 'Paid')) AS [total_spent],
                (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'successfull' OR p.[status] = 'Paid')) AS [total_earned],
                (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = u.[id]) AS [total_tasks_given],
                (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = u.[id]) AS [total_tasks_done]
             FROM [users] u
             $where
             ORDER BY u.[id] DESC"
        );

        foreach ($rows as $row) {
            $decoded = !empty($row->expertise) ? json_decode($row->expertise, true) : null;
            if (is_array($decoded) && !empty($decoded)) {
                $row->trade = implode(', ', $decoded);
            } elseif (is_string($decoded)) {
                $row->trade = $decoded;
            } else {
                $row->trade = $row->role === 'worker' ? ($row->expertise ?? 'Worker') : '—';
            }
        }

        return response()->json($rows);
    }

    /**
     * Get Clients with subquery for total money spent, ranked by spending
     */
    public function clients(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rank = $request->query('rank');
        $allowed = ['none', '1st', '2nd', '3rd'];
        if (!in_array($rank, $allowed, true)) {
            $rank = 'none';
        }

        $top = '';
        $where = "WHERE (u.[role] = 'client' OR u.[role] = 'customer' OR u.[role] IS NULL OR u.[role] = '')";

        if ($rank === '1st') {
            $top = 'TOP 1';
        } elseif ($rank === '2nd') {
            $top = 'TOP 1';
            $where .= " AND (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'successfull' OR p.[status] = 'Paid')) < (SELECT TOP 1 (SELECT ISNULL(SUM(p2.[amount]), 0) FROM [payments] p2 WHERE p2.[customer_id] = u2.[id] AND (p2.[status] = 'Complete' OR p2.[status] = 'successfull' OR p2.[status] = 'Paid')) FROM [users] u2 WHERE (u2.[role] = 'client' OR u2.[role] = 'customer' OR u2.[role] IS NULL OR u2.[role] = '') ORDER BY (SELECT ISNULL(SUM(p2.[amount]), 0) FROM [payments] p2 WHERE p2.[customer_id] = u2.[id] AND (p2.[status] = 'Complete' OR p2.[status] = 'successfull' OR p2.[status] = 'Paid')) DESC)";
        } elseif ($rank === '3rd') {
            $top = 'TOP 1';
            $where .= " AND (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'successfull' OR p.[status] = 'Paid')) < (SELECT TOP 1 (SELECT ISNULL(SUM(p2.[amount]), 0) FROM [payments] p2 WHERE p2.[customer_id] = u2.[id] AND (p2.[status] = 'Complete' OR p2.[status] = 'successfull' OR p2.[status] = 'Paid')) FROM [users] u2 WHERE (u2.[role] = 'client' OR u2.[role] = 'customer' OR u2.[role] IS NULL OR u2.[role] = '') AND (SELECT ISNULL(SUM(p2.[amount]), 0) FROM [payments] p2 WHERE p2.[customer_id] = u2.[id] AND (p2.[status] = 'Complete' OR p2.[status] = 'successfull' OR p2.[status] = 'Paid')) < (SELECT TOP 1 (SELECT ISNULL(SUM(p3.[amount]), 0) FROM [payments] p3 WHERE p3.[customer_id] = u3.[id] AND (p3.[status] = 'Complete' OR p3.[status] = 'successfull' OR p3.[status] = 'Paid')) FROM [users] u3 WHERE (u3.[role] = 'client' OR u3.[role] = 'customer' OR u3.[role] IS NULL OR u3.[role] = '') ORDER BY (SELECT ISNULL(SUM(p3.[amount]), 0) FROM [payments] p3 WHERE p3.[customer_id] = u3.[id] AND (p3.[status] = 'Complete' OR p3.[status] = 'successfull' OR p3.[status] = 'Paid')) DESC) ORDER BY (SELECT ISNULL(SUM(p2.[amount]), 0) FROM [payments] p2 WHERE p2.[customer_id] = u2.[id] AND (p2.[status] = 'Complete' OR p2.[status] = 'successfull' OR p2.[status] = 'Paid')) DESC)";
        }

        $rows = DB::select(
            "SELECT $top 
                u.[id], 
                u.[name], 
                u.[email], 
                u.[phone], 
                u.[location], 
                ISNULL(u.[role], 'client') AS [role], 
                u.[created_at],
                (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'successfull' OR p.[status] = 'Paid')) AS [total_spent],
                (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[user_id] = u.[id]) AS [total_tasks_given]
             FROM [users] u
             $where
             ORDER BY (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[customer_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'successfull' OR p.[status] = 'Paid')) DESC, u.[id] DESC"
        );

        return response()->json($rows);
    }

    /**
     * Alias for clients
     */
    public function customers(Request $request): JsonResponse
    {
        return $this->clients($request);
    }

    /**
     * Get Workers with subquery for total money received/gained, ranked by earnings
     */
    public function workers(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rank = $request->query('rank');
        $allowed = ['none', '1st', '2nd', '3rd'];
        if (!in_array($rank, $allowed, true)) {
            $rank = 'none';
        }

        $top = '';
        $where = "WHERE u.[role] = 'worker'";

        if ($rank === '1st') {
            $top = 'TOP 1';
        } elseif ($rank === '2nd') {
            $top = 'TOP 1';
            $where .= " AND (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'successfull' OR p.[status] = 'Paid')) < (SELECT TOP 1 (SELECT ISNULL(SUM(p2.[amount]), 0) FROM [payments] p2 WHERE p2.[worker_id] = u2.[id] AND (p2.[status] = 'Complete' OR p2.[status] = 'successfull' OR p2.[status] = 'Paid')) FROM [users] u2 WHERE u2.[role] = 'worker' ORDER BY (SELECT ISNULL(SUM(p2.[amount]), 0) FROM [payments] p2 WHERE p2.[worker_id] = u2.[id] AND (p2.[status] = 'Complete' OR p2.[status] = 'successfull' OR p2.[status] = 'Paid')) DESC)";
        } elseif ($rank === '3rd') {
            $top = 'TOP 1';
            $where .= " AND (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'successfull' OR p.[status] = 'Paid')) < (SELECT TOP 1 (SELECT ISNULL(SUM(p2.[amount]), 0) FROM [payments] p2 WHERE p2.[worker_id] = u2.[id] AND (p2.[status] = 'Complete' OR p2.[status] = 'successfull' OR p2.[status] = 'Paid')) FROM [users] u2 WHERE u2.[role] = 'worker' AND (SELECT ISNULL(SUM(p2.[amount]), 0) FROM [payments] p2 WHERE p2.[worker_id] = u2.[id] AND (p2.[status] = 'Complete' OR p2.[status] = 'successfull' OR p2.[status] = 'Paid')) < (SELECT TOP 1 (SELECT ISNULL(SUM(p3.[amount]), 0) FROM [payments] p3 WHERE p3.[worker_id] = u3.[id] AND (p3.[status] = 'Complete' OR p3.[status] = 'successfull' OR p3.[status] = 'Paid')) FROM [users] u3 WHERE u3.[role] = 'worker' ORDER BY (SELECT ISNULL(SUM(p3.[amount]), 0) FROM [payments] p3 WHERE p3.[worker_id] = u3.[id] AND (p3.[status] = 'Complete' OR p3.[status] = 'successfull' OR p3.[status] = 'Paid')) DESC) ORDER BY (SELECT ISNULL(SUM(p2.[amount]), 0) FROM [payments] p2 WHERE p2.[worker_id] = u2.[id] AND (p2.[status] = 'Complete' OR p2.[status] = 'successfull' OR p2.[status] = 'Paid')) DESC)";
        }

        $rows = DB::select(
            "SELECT $top 
                u.[id], 
                u.[name], 
                u.[email], 
                u.[phone], 
                u.[location], 
                u.[expertise], 
                u.[role], 
                u.[created_at],
                (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'successfull' OR p.[status] = 'Paid')) AS [total_earned],
                (SELECT COUNT(t.[id]) FROM [tasks] t WHERE t.[assigned_worker_id] = u.[id]) AS [total_tasks_done]
             FROM [users] u
             $where
             ORDER BY (SELECT ISNULL(SUM(p.[amount]), 0) FROM [payments] p WHERE p.[worker_id] = u.[id] AND (p.[status] = 'Complete' OR p.[status] = 'successfull' OR p.[status] = 'Paid')) DESC, u.[id] DESC"
        );

        foreach ($rows as $row) {
            $decoded = !empty($row->expertise) ? json_decode($row->expertise, true) : null;
            if (is_array($decoded) && !empty($decoded)) {
                $row->trade = implode(', ', $decoded);
            } elseif (is_string($decoded)) {
                $row->trade = $decoded;
            } else {
                $row->trade = $row->expertise ?? 'Worker';
            }
        }

        return response()->json($rows);
    }

    /**
     * Aggregate queries for Total Users, Clients, Workers, Tasks Given, and Tasks Done
     */
    public function summary(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Aggregate 1: Total Users
        $totalUsersRow = DB::select("SELECT COUNT([id]) AS total FROM [users]");
        $totalUsers = !empty($totalUsersRow) ? (int) $totalUsersRow[0]->total : 0;

        // Aggregate 2: Total Workers
        $totalWorkersRow = DB::select("SELECT COUNT([id]) AS total FROM [users] WHERE [role] = 'worker'");
        $totalWorkers = !empty($totalWorkersRow) ? (int) $totalWorkersRow[0]->total : 0;

        // Aggregate 3: Total Clients (Customers)
        $totalClientsRow = DB::select("SELECT COUNT([id]) AS total FROM [users] WHERE ([role] = 'client' OR [role] = 'customer' OR [role] IS NULL OR [role] = '')");
        $totalClients = !empty($totalClientsRow) ? (int) $totalClientsRow[0]->total : 0;

        // Aggregate 4: JOIN tasks & users - How many users (clients) have given tasks
        $tasksGivenRow = DB::select(
            "SELECT COUNT(DISTINCT t.[user_id]) AS total 
             FROM [tasks] t 
             INNER JOIN [users] u ON u.[id] = t.[user_id]"
        );
        $tasksGivenUsers = !empty($tasksGivenRow) ? (int) $tasksGivenRow[0]->total : 0;

        // Aggregate 5: JOIN tasks & users - How many task works done by workers
        $tasksDoneRow = DB::select(
            "SELECT COUNT(t.[id]) AS total 
             FROM [tasks] t 
             INNER JOIN [users] w ON w.[id] = t.[assigned_worker_id] 
             WHERE t.[assigned_worker_id] IS NOT NULL"
        );
        $tasksDoneWorkers = !empty($tasksDoneRow) ? (int) $tasksDoneRow[0]->total : 0;

        // Aggregate 6: Total completed tasks
        $completedTasksRow = DB::select("SELECT COUNT([id]) AS total FROM [tasks] WHERE [status] = 'completed'");
        $completedTasks = !empty($completedTasksRow) ? (int) $completedTasksRow[0]->total : 0;

        return response()->json([
            'total_users'        => $totalUsers,
            'total_clients'      => $totalClients,
            'total_customers'    => $totalClients,
            'total_workers'      => $totalWorkers,
            'tasks_given_users'  => $tasksGivenUsers,
            'tasks_done_workers' => $tasksDoneWorkers,
            'completed_tasks'    => $completedTasks,
        ]);
    }
}
