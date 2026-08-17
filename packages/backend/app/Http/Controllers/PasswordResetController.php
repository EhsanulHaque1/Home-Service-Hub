<?php

namespace App\Http\Controllers;

use App\Mail\WelcomeEmail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
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
     * Send email verification link for resetting password.
     */
    public function sendResetLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user) {
            return response()->json([
                'message' => 'If an account exists for this email, a password reset link has been sent.',
            ]);
        }

        // Generate temporary signed URL valid for 60 minutes
        $resetUrl = URL::temporarySignedRoute(
            'password.reset.verify',
            now()->addMinutes(60),
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        try {
            Mail::to($user->email)->send(new WelcomeEmail(
                'We received a request to reset your password for Home Service Hub. Please click the button below to verify your email and set a new password.',
                'Reset Your Password - Home Service Hub',
                $resetUrl,
                'Reset Password'
            ));
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to send password reset email. Please try again later.',
            ], 500);
        }

        return response()->json([
            'message' => 'A password reset link has been sent to your email. Please check your inbox.',
        ]);
    }

    /**
     * Handle the signed email verification link callback for password reset.
     * Generates a reset token and redirects the user to the frontend reset password form.
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

        // Create or update a secure reset token
        $token = Str::random(64);
        $userEmail = strtolower(trim($user->email));

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $userEmail],
            [
                'token' => Hash::make($token),
                'created_at' => now(),
            ]
        );

        $encodedEmail = urlencode($userEmail);
        return redirect()->to("{$frontendUrl}/reset-password?email={$encodedEmail}&token={$token}");
    }

    /**
     * Complete password reset using verified token and new password.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = strtolower(trim($validated['email']));

        $record = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        if (!$record) {
            return response()->json([
                'message' => 'Invalid or expired password reset request. Please request a new link.',
            ], 422);
        }

        // Verify token expiry (60 minutes)
        if ($record->created_at && now()->diffInMinutes($record->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();
            return response()->json([
                'message' => 'Password reset link has expired. Please request a new link.',
            ], 422);
        }

        if (!Hash::check($validated['token'], $record->token)) {
            return response()->json([
                'message' => 'Invalid reset token. Please request a new link.',
            ], 422);
        }

        $user = User::where('email', $validated['email'])->first();
        if (!$user) {
            return response()->json([
                'message' => 'User not found.',
            ], 404);
        }

        // Update password and mark email verified if it wasn't already
        $user->password = Hash::make($validated['password']);
        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }
        $user->save();

        // Clear the reset token
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        // Automatically log in the user and keep authentication active
        Auth::guard('web')->login($user, true);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Password has been reset successfully! You are now logged in.',
            'user' => $user->fresh(),
        ]);
    }
}
