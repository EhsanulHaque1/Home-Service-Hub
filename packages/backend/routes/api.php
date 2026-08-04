<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ComplaintController;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Authenticated auth routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/user', [AuthController::class, 'me']);
});

// Complaints routes
Route::get('/complaints', [ComplaintController::class, 'index']);
Route::post('/complaints', [ComplaintController::class, 'store']);
