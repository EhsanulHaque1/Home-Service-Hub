<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Response;

class ClearCookiesOnLogout
{
    /**
     * Only clear cookies on explicit logout, not on every unauthenticated API response.
     * This middleware should only run on web routes, not API routes.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip this middleware for API routes - let Sanctum handle auth
        if ($request->is('api/*')) {
            return $next($request);
        }

        $response = $next($request);

        // Check if current user is logged in
        $isAuthenticated = Auth::check();

        if (!$isAuthenticated) {
            $cookiePath = config('session.path', '/');
            $configuredDomain = config('session.domain');

            $cookiesToClear = array_filter(array_unique([
                config('session.cookie'),
                'homeservicehub_session',
                'homeservicehub-session',
                'laravel_session',
                'auth_token',
                'XSRF-TOKEN',
            ]));

            // 1. Strip any active Set-Cookie headers added by StartSession or Sanctum middleware
            foreach ($response->headers->getCookies() as $c) {
                if (in_array($c->getName(), $cookiesToClear, true)) {
                    $response->headers->removeCookie($c->getName(), $c->getPath(), $c->getDomain());
                }
            }

            // 2. Attach explicit expired cookies matching all combinations of httpOnly/domain so browser deletes them
            $domainsToClear = array_unique([$configuredDomain, null, 'localhost', '.localhost', '127.0.0.1']);

            foreach ($cookiesToClear as $cookieName) {
                foreach ($domainsToClear as $domain) {
                    foreach ([true, false] as $httpOnly) {
                        $response->headers->setCookie(
                            new Cookie(
                                $cookieName,
                                '',
                                1,
                                $cookiePath,
                                $domain,
                                false,
                                $httpOnly,
                                false,
                                Cookie::SAMESITE_LAX
                            )
                        );
                    }
                }
            }
        }

        return $response;
    }
}
