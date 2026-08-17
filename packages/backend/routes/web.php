<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\MailController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\VerificationController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
    ]);
});

Route::get('/send-mail', [MailController::class, 'sendEmail']);

// Email Verification signed link callback route (Sign up)
Route::get('/email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
    ->name('verification.verify');

// Email Verification signed link callback route (Password Reset)
Route::get('/email/password-reset/{id}/{hash}', [PasswordResetController::class, 'verify'])
    ->name('password.reset.verify');

// Email Verification signed link callback route (Delete Account)
Route::get('/email/delete-account/{id}/{hash}', [AccountController::class, 'verifyAndDelete'])
    ->name('account.delete.verify');
