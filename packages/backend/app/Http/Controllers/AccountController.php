<?php

namespace App\Http\Controllers;

use App\Mail\WelcomeEmail;
use App\Models\Message;
use App\Models\Task;
use App\Models\TaskApplication;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class AccountController extends Controller
{
    /**
     * Clear all session state and set expired headers to wipe session/auth cookies.
     */
    private function clearCookies(JsonResponse $response, Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        $cookieName = config('session.cookie', 'homeservicehub_session');
        $cookiePath = config('session.path', '/');
        $cookieDomain = config('session.domain');

        return $response
            ->withCookie(cookie()->forget($cookieName, $cookiePath, $cookieDomain))
            ->withCookie(cookie()->forget('XSRF-TOKEN', $cookiePath, $cookieDomain));
    }

    /**
     * Send email verification link for deleting the authenticated user's account.
     */
    public function requestDeletion(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Generate temporary signed URL valid for 60 minutes
        $deleteUrl = URL::temporarySignedRoute(
            'account.delete.verify',
            now()->addMinutes(60),
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        try {
            Mail::to($user->email)->send(new WelcomeEmail(
                'We received a request to permanently delete your Home Service Hub account. If you confirm this deletion, click the button below. This action cannot be undone and all your data will be permanently removed.',
                'Confirm Account Deletion - Home Service Hub',
                $deleteUrl,
                'Confirm Account Deletion'
            ));
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to send account deletion email. Please try again later.',
            ], 500);
        }

        return response()->json([
            'message' => 'A confirmation link has been sent to your email. Please click the link in your email to permanently delete your account.',
        ]);
    }

    /**
     * Handle the signed email verification link callback for account deletion.
     * Deletes user records, clears session cookies, and redirects to frontend sign-in.
     */
    public function verifyAndDelete(Request $request, $id, $hash): RedirectResponse
    {
        $frontendConfig = env('FRONTEND_URLS', 'http://localhost:5173');
        $frontendUrl = explode(',', $frontendConfig)[0] ?? 'http://localhost:5173';

        $user = User::find($id);

        if (!$user) {
            return redirect()->to("{$frontendUrl}/sign-in?account_deleted=1");
        }

        if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return redirect()->to("{$frontendUrl}/sign-in?error=invalid_hash");
        }

        if (!URL::hasValidSignature($request)) {
            return redirect()->to("{$frontendUrl}/sign-in?error=invalid_signature");
        }

        try {
            DB::transaction(function () use ($user) {
                $userId = $user->getKey();
                $userEmail = $user->email;

                // 1. Delete task applications made by this user (user_id column)
                DB::table('task_applications')->where('user_id', $userId)->delete();

                // 2. Unassign this user from any assigned tasks
                DB::table('tasks')->where('assigned_worker_id', $userId)->update(['assigned_worker_id' => null]);

                // 3. Delete task applications for tasks posted by this user
                $userTaskIds = DB::table('tasks')->where('user_id', $userId)->pluck('id');
                if ($userTaskIds->isNotEmpty()) {
                    DB::table('task_applications')->whereIn('task_id', $userTaskIds)->delete();
                }

                // 4. Delete tasks created by this user
                DB::table('tasks')->where('user_id', $userId)->delete();

                // 5. Delete chat messages (from_user_id & to_user_id columns)
                DB::table('messages')
                    ->where('from_user_id', $userId)
                    ->orWhere('to_user_id', $userId)
                    ->delete();

                // 6. Delete tokens & password resets
                DB::table('password_reset_tokens')->where('email', $userEmail)->delete();

                // 7. Delete all database sessions for this user
                DB::table('sessions')->where('user_id', $userId)->delete();

                // 8. Delete personal access tokens
                DB::table('personal_access_tokens')
                    ->where('tokenable_type', User::class)
                    ->where('tokenable_id', $userId)
                    ->delete();

                // 9. Completely delete user record from users table
                DB::table('users')->where('id', $userId)->delete();
            });
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Account deletion transaction failed: ' . $e->getMessage());
            // Fallback direct delete on users table
            try {
                DB::table('users')->where('id', $user->id)->delete();
            } catch (\Throwable $ex) {
                \Illuminate\Support\Facades\Log::error('Fallback direct user delete failed: ' . $ex->getMessage());
            }
        }

        // Log out user, flush & invalidate session
        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->flush();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        $redirectResponse = redirect()->to("{$frontendUrl}/sign-in");

        $cookiesToClear = [
            config('session.cookie', 'homeservicehub_session'),
            'homeservicehub_session',
            'homeservicehub-session',
            'laravel_session',
            'auth_token',
            'XSRF-TOKEN',
        ];

        $domainsToClear = array_unique([config('session.domain'), null, 'localhost', '.localhost', '127.0.0.1']);
        $cookiePath = config('session.path', '/');

        foreach ($cookiesToClear as $cName) {
            foreach ($domainsToClear as $dom) {
                foreach ([true, false] as $httpOnly) {
                    $redirectResponse->headers->setCookie(
                        new \Symfony\Component\HttpFoundation\Cookie(
                            $cName,
                            '',
                            1,
                            $cookiePath,
                            $dom,
                            false,
                            $httpOnly,
                            false,
                            \Symfony\Component\HttpFoundation\Cookie::SAMESITE_LAX
                        )
                    );
                }
            }
        }

        return $redirectResponse;
    }
}
