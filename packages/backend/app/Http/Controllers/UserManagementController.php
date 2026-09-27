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

    public function clients(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rank = $request->query('rank');
        
        $offsetClause = '';
        if ($rank === '1st') {
            $offsetClause = "OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY";
        } elseif ($rank === '2nd') {
            $offsetClause = "OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY";
        } elseif ($rank === '3rd') {
            $offsetClause = "OFFSET 2 ROWS FETCH NEXT 1 ROWS ONLY";
        }

        $rows = DB::select(
            "SELECT 
                c.[user_id] AS [id], 
                c.[name], 
                c.[email], 
                c.[phone], 
                c.[location], 
                'client' AS [role], 
                c.[created_at],
                c.[total_money_spent] AS [total_spent],
                c.[total_tasks_given] AS [total_tasks_given]
             FROM [clients] c
             WHERE c.[user_id] IS NOT NULL
             ORDER BY c.[total_money_spent] DESC, c.[id] DESC
             $offsetClause"
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

    public function workers(Request $request): JsonResponse
    {
        if (($request->user()->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rank = $request->query('rank');
        
        $offsetClause = '';
        if ($rank === '1st') {
            $offsetClause = "OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY";
        } elseif ($rank === '2nd') {
            $offsetClause = "OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY";
        } elseif ($rank === '3rd') {
            $offsetClause = "OFFSET 2 ROWS FETCH NEXT 1 ROWS ONLY";
        }

        $rows = DB::select(
            "SELECT 
                w.[user_id] AS [id], 
                w.[name], 
                w.[email], 
                w.[phone], 
                w.[location], 
                w.[trade], 
                'worker' AS [role], 
                w.[created_at],
                w.[total_money_gained] AS [total_earned],
                w.[jobs_completed] AS [total_tasks_done]
             FROM [workers] w
             WHERE w.[user_id] IS NOT NULL
             ORDER BY w.[total_money_gained] DESC, w.[id] DESC
             $offsetClause"
        );

        foreach ($rows as $row) {
            $decoded = !empty($row->trade) ? json_decode($row->trade, true) : null;
            if (is_array($decoded) && !empty($decoded)) {
                $row->trade = implode(', ', $decoded);
            } elseif (is_string($decoded)) {
                $row->trade = $decoded;
            } else {
                $row->trade = $row->trade ?? 'Worker';
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
        $totalWorkersRow = DB::select("SELECT COUNT([id]) AS total FROM [workers] WHERE [user_id] IS NOT NULL");
        $totalWorkers = !empty($totalWorkersRow) ? (int) $totalWorkersRow[0]->total : 0;

        // Aggregate 3: Total Clients (Customers)
        $totalClientsRow = DB::select("SELECT COUNT([id]) AS total FROM [clients] WHERE [user_id] IS NOT NULL");
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
