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

    public function sendResetLink(Request $request): JsonResponse
    {
        $email = $request->input('email');

        $rows = DB::select("SELECT * FROM [users] WHERE [email] = '$email'");
        $userRow = $rows[0] ?? null;

        if (!$userRow) {
            return response()->json([
                'message' => 'If an account exists for this email, a password reset link has been sent.',
            ]);
        }

        $resetUrl = URL::temporarySignedRoute(
            'password.reset.verify',
            now()->addMinutes(60),
            [
                'id' => $userRow->id,
                'hash' => sha1(strtolower(trim($userRow->email))),
            ]
        );

        try {
            Mail::to($userRow->email)->send(new WelcomeEmail(
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

        $token = Str::random(64);
        $userEmail = strtolower(trim($userRow->email));

        DB::delete("DELETE FROM [password_reset_tokens] WHERE [email] = '$userEmail'");
        DB::insert(
            "INSERT INTO [password_reset_tokens] ([email], [token], [created_at])
             VALUES ('$userEmail', '" . Hash::make($token) . "', GETDATE())"
        );

        $encodedEmail = urlencode($userEmail);
        return redirect()->to("{$frontendUrl}/reset-password?email={$encodedEmail}&token={$token}");
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email')));
        $token = $request->input('token');
        $password = $request->input('password');

        $records = DB::select("SELECT * FROM [password_reset_tokens] WHERE [email] = '$email'");
        $record = $records[0] ?? null;

        if (!$record) {
            return response()->json([
                'message' => 'Invalid or expired password reset request. Please request a new link.',
            ], 422);
        }

        if ($record->created_at && now()->diffInMinutes($record->created_at) > 60) {
            DB::delete("DELETE FROM [password_reset_tokens] WHERE [email] = '$email'");
            return response()->json([
                'message' => 'Password reset link has expired. Please request a new link.',
            ], 422);
        }

        if (!Hash::check($token, $record->token)) {
            return response()->json([
                'message' => 'Invalid reset token. Please request a new link.',
            ], 422);
        }

        $userRows = DB::select("SELECT * FROM [users] WHERE [email] = '$email'");
        $userRow = $userRows[0] ?? null;

        if (!$userRow) {
            return response()->json([
                'message' => 'User not found.',
            ], 404);
        }

        $hashed = Hash::make($password);
        DB::update("UPDATE [users] SET [password] = '$hashed', [updated_at] = GETDATE() WHERE [id] = $userRow->id");

        if (!$userRow->email_verified_at) {
            DB::update("UPDATE [users] SET [email_verified_at] = GETDATE(), [updated_at] = GETDATE() WHERE [id] = $userRow->id");
        }

        DB::delete("DELETE FROM [password_reset_tokens] WHERE [email] = '$email'");

        $user = $this->hydrateUser($userRow);
        Auth::guard('web')->login($user, true);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Password has been reset successfully! You are now logged in.',
            'user' => $user,
        ]);
    }
}
