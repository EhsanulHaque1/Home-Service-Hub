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

class VerificationController extends Controller
{
    private function hydrateUser($row): User
    {
        $user = new User();
        foreach ((array) $row as $key => $value) {
            $user->$key = $value;
        }
        $user->exists = true;

        return $user;
    }

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

    public function verify(Request $request, $id, $hash): RedirectResponse
    {
        $frontendConfig = env('FRONTEND_URLS', 'http://localhost:5173');
        $frontendUrl = explode(',', $frontendConfig)[0] ?? 'http://localhost:5173';

        $rows = DB::select("SELECT * FROM [users] WHERE [id] = $id");
        $userRow = $rows[0] ?? null;

        if (!$userRow) {
            return redirect()->to("{$frontendUrl}/sign-in?error=invalid_user");
        }

        if (!hash_equals((string) $hash, sha1(strtolower(trim($userRow->email))))) {
            return redirect()->to("{$frontendUrl}/sign-in?error=invalid_hash");
        }

        if (!URL::hasValidSignature($request)) {
            return redirect()->to("{$frontendUrl}/sign-in?error=invalid_signature");
        }

        if (!$userRow->email_verified_at) {
            DB::update("UPDATE [users] SET [email_verified_at] = GETDATE(), [updated_at] = GETDATE() WHERE [id] = $id");
        }

        $user = $this->hydrateUser($userRow);
        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->to("{$frontendUrl}/?verified=1");
    }

    public function resend(Request $request): JsonResponse
    {
        $email = $request->input('email');

        $rows = DB::select("SELECT * FROM [users] WHERE [email] = '$email'");
        $userRow = $rows[0] ?? null;

        if (!$userRow) {
            return $this->clearCookies(
                response()->json([
                    'message' => 'If an account exists for this email, a verification link has been sent.',
                ]),
                $request
            );
        }

        if ($userRow->email_verified_at) {
            return response()->json([
                'message' => 'Email address is already verified. You can log in.',
            ]);
        }

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $userRow->id,
                'hash' => sha1(strtolower(trim($userRow->email))),
            ]
        );

        try {
            Mail::to($userRow->email)->send(new WelcomeEmail(
                'Please click the button below to verify your email address and activate your Home Service Hub account.',
                'Verify Your Email Address - Home Service Hub',
                $verificationUrl
            ));
        } catch (\Throwable $e) {
            return $this->clearCookies(
                response()->json([
                    'message' => 'Failed to send verification email. Please try again later.',
                ], 500),
                $request
            );
        }

        return $this->clearCookies(
            response()->json([
                'message' => 'Verification link sent! Please check your email inbox.',
            ]),
            $request
        );
    }
}
