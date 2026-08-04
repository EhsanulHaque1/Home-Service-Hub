<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ClearCookiesOnLogout
{
    /**
     * Manage auth cookies:
     * - Only successful login (200) and registration (201) will receive session cookies.
     * - Failed login attempts (422/401/error) receive NO cookies (cookies are expired/cleared).
     * - Signing out expires and clears all cookies so they vanish from the browser.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $path = trim($request->path(), '/');
        $isLogout = str_ends_with($path, 'logout');
        $isAuthPath = $isLogout
            || str_ends_with($path, 'login')
            || str_ends_with($path, 'register');

        $isFailedAuth = ($isAuthPath && !$isLogout && $response->getStatusCode() >= 400);

        if ($isLogout || $isFailedAuth) {
            $cookiePath = config('session.path', '/');
            $cookieDomain = config('session.domain');

            $cookiesToClear = array_unique([
                config('session.cookie'),
                'homeservicehub_session',
                'homeservicehub-session',
                'laravel_session',
                'auth_token',
                'XSRF-TOKEN',
            ]);

            foreach ($cookiesToClear as $cookieName) {
                if ($cookieName) {
                    $response->headers->setCookie(cookie()->forget($cookieName, $cookiePath, $cookieDomain));
                }
            }
        }

        return $response;
    }
}
