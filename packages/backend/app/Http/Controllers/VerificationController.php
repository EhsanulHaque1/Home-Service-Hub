<?php

namespace App\Http\Controllers;

use App\Mail\WelcomeEmail;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class VerificationController extends Controller
{
    /**
     * Clear all session state and set expired headers to wipe session/auth cookies from client browser.
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
     * Mark the user's email address as verified when clicking the signed URL,
     * log the user in automatically, and redirect to the signed-in home page.
     */
    public function verify(Request $request, $id, $hash): RedirectResponse
    {
        $frontendConfig = env('FRONTEND_URLS', 'http://localhost:5173');
        $frontendUrl = explode(',', $frontendConfig)[0] ?? 'http://localhost:5173';

        $user = User::find($id);

        if (!$user) {
            return redirect()->to("{$frontendUrl}/sign-in?error=invalid_user");
        }

        if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return redirect()->to("{$frontendUrl}/sign-in?error=invalid_hash");
        }

        if (!URL::hasValidSignature($request)) {
            return redirect()->to("{$frontendUrl}/sign-in?error=invalid_signature");
        }

        if (!$user->hasVerifiedEmail()) {
            if ($user->markEmailAsVerified()) {
                event(new Verified($user));
            }
        }

        // Automatically log in the user ONLY after successful email verification
        Auth::login($user);
        $request->session()->regenerate();

        // Redirect directly to the signed-in home page
        return redirect()->to("{$frontendUrl}/?verified=1");
    }

    /**
     * Resend the email verification notification.
     * Enforces NO cookie issuance during unverified resend request.
     */
    public function resend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user) {
            return $this->clearCookies(
                response()->json([
                    'message' => 'If an account exists for this email, a verification link has been sent.',
                ]),
                $request
            );
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email address is already verified. You can log in.',
            ]);
        }

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        try {
            Mail::to($user->email)->send(new WelcomeEmail(
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
