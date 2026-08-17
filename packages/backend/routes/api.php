<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ComplaintController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\TaskApplicationController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\WorkerController;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/check-email', [AuthController::class, 'checkEmail']);
Route::post('/email/resend', [VerificationController::class, 'resend']);
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
Route::post('/reset-password', [PasswordResetController::class, 'resetPassword']);

// Authenticated auth routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/account/delete-request', [AccountController::class, 'requestDeletion']);

    Route::get('/my-applications', [TaskApplicationController::class, 'index']);
    Route::post('/tasks/{task}/apply', [TaskApplicationController::class, 'store']);
    Route::post('/applications/{application}/confirm', [TaskApplicationController::class, 'confirm']);

    Route::get('/my-tasks', [TaskController::class, 'myTasks']);
    Route::put('/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
    Route::get('/tasks/{task}/applicants', [TaskController::class, 'applicants']);

    Route::get('/chat/conversations', [ChatController::class, 'conversations']);
    Route::get('/chat/users', [ChatController::class, 'users']);
    Route::get('/chat/messages/{user}', [ChatController::class, 'messages']);
    Route::post('/chat/messages', [ChatController::class, 'store']);
    Route::put('/chat/messages/{message}', [ChatController::class, 'update']);
    Route::delete('/chat/messages/{message}', [ChatController::class, 'destroy']);
});

// Complaints routes
Route::get('/complaints', [ComplaintController::class, 'index']);
Route::post('/complaints', [ComplaintController::class, 'store']);

Route::get('/tasks', [TaskController::class, 'index']);
Route::post('/tasks', [TaskController::class, 'store']);
Route::get('/tasks/{task}', [TaskController::class, 'show']);

Route::get('/workers', [WorkerController::class, 'index']);
Route::get('/workers/{worker}', [WorkerController::class, 'show']);
