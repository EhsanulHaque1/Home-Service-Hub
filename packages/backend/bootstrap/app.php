<?php

use App\Http\Middleware\ClearCookiesOnLogout;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->alias([
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
        ]);

        $middleware->statefulApi();
        $middleware->api(append: [
            ClearCookiesOnLogout::class,
        ]);
        $middleware->append(ClearCookiesOnLogout::class);
        $middleware->validateCsrfTokens(except: [
            'api/complaints',
            'api/chat',
            'api/chat/*',
            'api/tasks',
            'api/tasks/*',
            'api/register',
            'api/login',
            'api/logout',
            'api/check-email',
            'api/email/resend',
            'api/profile',
            'api/applications/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
