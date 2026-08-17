<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ComplaintController;
use App\Http\Controllers\TaskApplicationController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\WorkerController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Authentication & Public Guest Routes
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);
Route::post('/check-email', [AuthController::class, 'checkEmail']);
Route::post('/email/resend', [VerificationController::class, 'resend']);

/*
|--------------------------------------------------------------------------
| Authenticated Routes (Sanctum Session / Token)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);

    // Authenticated Tasks
    Route::get('/my-tasks', [TaskController::class, 'myTasks']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::get('/tasks/{task}/applicants', [TaskController::class, 'applicants']);
    Route::put('/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);

    // Task Applications
    Route::get('/my-applications', [TaskApplicationController::class, 'index']);
    Route::post('/tasks/{task}/apply', [TaskApplicationController::class, 'store']);
    Route::post('/applications/{application}/confirm', [TaskApplicationController::class, 'confirm']);

    // Real-time Chat
    Route::get('/chat/conversations', [ChatController::class, 'conversations']);
    Route::get('/chat/users', [ChatController::class, 'users']);
    Route::get('/chat/messages/{user}', [ChatController::class, 'messages']);
    Route::post('/chat/messages', [ChatController::class, 'store']);
    Route::put('/chat/messages/{message}', [ChatController::class, 'update']);
    Route::delete('/chat/messages/{message}', [ChatController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| Public Resource Routes
|--------------------------------------------------------------------------
*/
Route::get('/tasks', [TaskController::class, 'index']);
Route::get('/tasks/{task}', [TaskController::class, 'show']);

Route::get('/workers', [WorkerController::class, 'index']);
Route::get('/workers/{worker}', [WorkerController::class, 'show']);

Route::get('/complaints', [ComplaintController::class, 'index']);
Route::post('/complaints', [ComplaintController::class, 'store']);
