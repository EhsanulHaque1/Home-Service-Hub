<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class AdminTaskController extends Controller
{
    /**
     * Display all tasks with detailed information for admin panel
     * Uses: JOIN, AGGREGATE FUNCTION, SUB QUERY
     */
    public function index(Request $request)
    {
        $query = "
            SELECT 
                t.[id],
                t.[title],
                t.[description],
                t.[category],
                t.[budget],
                t.[location],
                t.[status],
                t.[progress],
                u.[name] AS client_name,
                u.[email] AS client_email,
                w.[name] AS assigned_worker,
                COUNT(ta.[id]) AS total_applications,
                ISNULL(SUM(CASE WHEN ta.[status] = 'accepted' THEN 1 ELSE 0 END), 0) AS accepted_applications,
                ISNULL(SUM(CASE WHEN ta.[status] = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected_applications,
                ISNULL(SUM(CASE WHEN ta.[status] = 'pending' THEN 1 ELSE 0 END), 0) AS pending_applications,
                (
                    SELECT COUNT(*) 
                    FROM [messages] m 
                    WHERE (m.[from_user_id] = t.[user_id] OR m.[to_user_id] = t.[user_id])
                ) AS total_messages,
                (
                    SELECT COUNT(*) 
                    FROM [payments] p 
                    WHERE p.[task_id] = t.[id]
                ) AS payment_count,
                (
                    SELECT ISNULL(SUM(p.[amount]), 0)
                    FROM [payments] p
                    WHERE p.[task_id] = t.[id] AND p.[status] = 'completed'
                ) AS total_paid,
                t.[created_at],
                t.[updated_at]
            FROM [tasks] t
            LEFT JOIN [users] u ON t.[user_id] = u.[id]
            LEFT JOIN [users] w ON t.[assigned_worker_id] = w.[id]
            LEFT JOIN [task_applications] ta ON t.[id] = ta.[task_id]
            GROUP BY 
                t.[id], t.[title], t.[description], t.[category], t.[budget], 
                t.[location], t.[status], t.[progress], u.[name], u.[email],
                w.[name], t.[user_id], t.[assigned_worker_id],
                t.[created_at], t.[updated_at]
            ORDER BY t.[created_at] DESC
        ";

        $tasks = DB::select($query);

        return response()->json([
            'success' => true,
            'data' => $tasks,
            'total' => count($tasks)
        ]);
    }

    /**
     * Get detailed task statistics with subqueries
     * Shows: Task performance metrics, average budget, application statistics
     */
    public function taskStatistics()
    {
        $query = "
            SELECT 
                t.[category],
                COUNT(t.[id]) AS total_tasks,
                AVG(t.[budget]) AS avg_budget,
                MIN(t.[budget]) AS min_budget,
                MAX(t.[budget]) AS max_budget,
                COUNT(CASE WHEN t.[status] = 'completed' THEN 1 END) AS completed_tasks,
                COUNT(CASE WHEN t.[status] = 'open' THEN 1 END) AS open_tasks,
                COUNT(CASE WHEN t.[status] = 'in_progress' THEN 1 END) AS in_progress_tasks,
                (
                    SELECT COUNT(DISTINCT ta.[user_id])
                    FROM [task_applications] ta
                    WHERE ta.[task_id] IN (
                        SELECT [id] FROM [tasks] WHERE [category] = t.[category]
                    )
                ) AS unique_applicants
            FROM [tasks] t
            GROUP BY t.[category]
            ORDER BY COUNT(t.[id]) DESC
        ";

        $statistics = DB::select($query);

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }

    /**
     * Get high-priority tasks with multiple subqueries
     * Shows tasks that need admin attention
     */
    public function highPriorityTasks()
    {
        $query = "
            SELECT 
                t.[id],
                t.[title],
                t.[category],
                t.[budget],
                u.[name] AS client_name,
                u.[email] AS client_email,
                t.[status],
                COUNT(ta.[id]) AS application_count,
                (
                    SELECT COUNT(*)
                    FROM [task_applications] ta2
                    WHERE ta2.[task_id] = t.[id] AND ta2.[status] = 'pending'
                ) AS pending_applications,
                (
                    SELECT TOP 1 u2.[name]
                    FROM [task_applications] ta3
                    INNER JOIN [users] u2 ON ta3.[user_id] = u2.[id]
                    WHERE ta3.[task_id] = t.[id]
                    ORDER BY ta3.[created_at] DESC
                ) AS latest_applicant,
                DATEDIFF(DAY, t.[created_at], GETDATE()) AS days_open
            FROM [tasks] t
            INNER JOIN [users] u ON t.[user_id] = u.[id]
            LEFT JOIN [task_applications] ta ON t.[id] = ta.[task_id]
            WHERE t.[status] IN ('open', 'in_progress')
                AND (
                    -- Subquery: Tasks with high applications
                    (SELECT COUNT(*) FROM [task_applications] WHERE [task_id] = t.[id]) > 5
                    OR
                    -- Subquery: Tasks open for more than 7 days
                    DATEDIFF(DAY, t.[created_at], GETDATE()) > 7
                    OR
                    -- Subquery: High budget tasks
                    t.[budget] > (SELECT AVG([budget]) * 1.5 FROM [tasks])
                )
            GROUP BY 
                t.[id], t.[title], t.[category], t.[budget], u.[name], u.[email], 
                t.[status], t.[created_at]
            ORDER BY DATEDIFF(DAY, t.[created_at], GETDATE()) DESC, t.[budget] DESC
        ";

        $priorityTasks = DB::select($query);

        return response()->json([
            'success' => true,
            'data' => $priorityTasks
        ]);
    }

    /**
     * Get tasks with application analytics using multiple aggregates and joins
     */
    public function tasksWithApplicationAnalytics()
    {
        $query = "
            SELECT 
                t.[id],
                t.[title],
                t.[budget],
                t.[status],
                u.[name] AS client_name,
                u.[email] AS client_email,
                COUNT(DISTINCT ta.[id]) AS total_applications,
                COUNT(DISTINCT CASE WHEN ta.[status] = 'accepted' THEN ta.[id] END) AS accepted_count,
                COUNT(DISTINCT CASE WHEN ta.[status] = 'rejected' THEN ta.[id] END) AS rejected_count,
                COUNT(DISTINCT CASE WHEN ta.[status] = 'pending' THEN ta.[id] END) AS pending_count,
                (
                    SELECT COUNT(*)
                    FROM [payments] p
                    WHERE p.[task_id] = t.[id] AND p.[status] = 'completed'
                ) AS completed_payments,
                (
                    SELECT ISNULL(SUM(p.[amount]), 0)
                    FROM [payments] p
                    WHERE p.[task_id] = t.[id] AND p.[status] = 'completed'
                ) AS total_amount_paid,
                (
                    SELECT TOP 1 w2.[name]
                    FROM [task_applications] ta2
                    INNER JOIN [users] w2 ON ta2.[user_id] = w2.[id]
                    WHERE ta2.[task_id] = t.[id]
                    ORDER BY ta2.[created_at] DESC
                ) AS latest_applicant
            FROM [tasks] t
            INNER JOIN [users] u ON t.[user_id] = u.[id]
            LEFT JOIN [task_applications] ta ON t.[id] = ta.[task_id]
            GROUP BY
                t.[id], t.[title], t.[budget], t.[status], 
                u.[name], u.[email]
            HAVING COUNT(DISTINCT ta.[id]) > 0
            ORDER BY COUNT(DISTINCT ta.[id]) DESC
        ";

        $tasksWithAnalytics = DB::select($query);

        return response()->json([
            'success' => true,
            'data' => $tasksWithAnalytics
        ]);
    }

    /**
     * Advanced: Tasks comparison with market average
     * Shows how each task compares to category average
     */
    public function tasksVsCategoryAverage()
    {
        $query = "
            SELECT 
                t.[id],
                t.[title],
                t.[category],
                t.[budget],
                t.[status],
                u.[name] AS client_name,
                COUNT(ta.[id]) AS applications_received,
                (
                    SELECT AVG([budget]) FROM [tasks] WHERE [category] = t.[category]
                ) AS category_avg_budget,
                (
                    SELECT AVG(ta2.[id]) FROM [task_applications] ta2
                    WHERE ta2.[task_id] IN (
                        SELECT [id] FROM [tasks] WHERE [category] = t.[category]
                    )
                ) AS category_avg_applications,
                CASE 
                    WHEN t.[budget] > (SELECT AVG([budget]) FROM [tasks] WHERE [category] = t.[category])
                    THEN 'Above Average'
                    WHEN t.[budget] < (SELECT AVG([budget]) FROM [tasks] WHERE [category] = t.[category])
                    THEN 'Below Average'
                    ELSE 'Average'
                END AS budget_comparison
            FROM [tasks] t
            INNER JOIN [users] u ON t.[user_id] = u.[id]
            LEFT JOIN [task_applications] ta ON t.[id] = ta.[task_id]
            GROUP BY 
                t.[id], t.[title], t.[category], t.[budget], 
                t.[status], u.[name]
            ORDER BY t.[category], t.[budget] DESC
        ";

        $comparison = DB::select($query);

        return response()->json([
            'success' => true,
            'data' => $comparison
        ]);
    }
}
