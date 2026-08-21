<?php

namespace App\Http\Controllers;

use App\Mail\WelcomeEmail;
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

    public function requestDeletion(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

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

    public function verifyAndDelete(Request $request, $id, $hash): RedirectResponse
    {
        $frontendConfig = env('FRONTEND_URLS', 'http://localhost:5173');
        $frontendUrl = explode(',', $frontendConfig)[0] ?? 'http://localhost:5173';

        $rows = DB::select("SELECT * FROM [users] WHERE [id] = $id");
        $userRow = $rows[0] ?? null;

        if (!$userRow) {
            return redirect()->to("{$frontendUrl}/sign-in?account_deleted=1");
        }

        if (!hash_equals((string) $hash, sha1(strtolower(trim($userRow->email))))) {
            return redirect()->to("{$frontendUrl}/sign-in?error=invalid_hash");
        }

        if (!URL::hasValidSignature($request)) {
            return redirect()->to("{$frontendUrl}/sign-in?error=invalid_signature");
        }

        $userId = $id;
        $userEmail = $userRow->email;

        try {
            DB::beginTransaction();

            // 1. Delete task applications made by this user (user_id column)
            DB::delete("DELETE FROM [task_applications] WHERE [user_id] = $userId");

            // 2. Unassign this user from any assigned tasks
            DB::update("UPDATE [tasks] SET [assigned_worker_id] = NULL WHERE [assigned_worker_id] = $userId");

            // 3. Delete task applications for tasks posted by this user
            DB::delete("DELETE FROM [task_applications] WHERE [task_id] IN (SELECT [id] FROM [tasks] WHERE [user_id] = $userId)");

            // 4. Delete tasks created by this user
            DB::delete("DELETE FROM [tasks] WHERE [user_id] = $userId");

            // 5. Delete chat messages (from_user_id & to_user_id columns)
            DB::delete("DELETE FROM [messages] WHERE [from_user_id] = $userId OR [to_user_id] = $userId");

            // 6. Delete tokens & password resets
            DB::delete("DELETE FROM [password_reset_tokens] WHERE [email] = '$userEmail'");

            // 7. Delete all database sessions for this user
            DB::delete("DELETE FROM [sessions] WHERE [user_id] = $userId");

            // 8. Delete personal access tokens
            DB::delete("DELETE FROM [personal_access_tokens] WHERE [tokenable_type] = '" . User::class . "' AND [tokenable_id] = $userId");

            // 9. Completely delete user record from users table
            DB::delete("DELETE FROM [users] WHERE [id] = $userId");

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Account deletion transaction failed: ' . $e->getMessage());
        }

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
