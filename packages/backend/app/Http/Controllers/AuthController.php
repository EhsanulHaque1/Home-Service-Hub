<?php

namespace App\Http\Controllers;

use App\Mail\WelcomeEmail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class AuthController extends Controller
{
    /**
     * Build a User model instance from a raw DB row so we can still use the
     * auth guard / $hidden password protection without going through Eloquent
     * queries.
     */
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

    public function register(Request $request): JsonResponse
    {
        $name = $request->input('name');
        $email = $request->input('email');
        $password = $request->input('password');
        $role = $request->input('role');
        $phone = $request->input('phone');
        $location = $request->input('location');
        $expertise = $request->input('expertise');

        $hashed = Hash::make($password);
        $expertiseJson = json_encode($role === 'worker' ? ($expertise ?? []) : null);
        $expertiseSql = $role === 'worker' ? "'$expertiseJson'" : 'NULL';

        DB::insert(
            "INSERT INTO [users] ([name], [email], [password], [role], [phone], [location], [expertise], [created_at], [updated_at])
             VALUES ('$name', '$email', '$hashed', '$role', '$phone', '$location', $expertiseSql, GETDATE(), GETDATE())"
        );

        $id = DB::getPdo()->lastInsertId();

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $id,
                'hash' => sha1(strtolower(trim($email))),
            ]
        );

        try {
            Mail::to($email)->send(new WelcomeEmail(
                'Thank you for registering with Home Service Hub! Please click the verification button below to activate your account.',
                'Verify Your Email Address - Home Service Hub',
                $verificationUrl
            ));
        } catch (\Throwable $e) {
            Log::error('Failed to send verification email: ' . $e->getMessage());
        }

        return $this->clearCookies(
            response()->json([
                'message' => 'Registration successful! A verification link has been sent to your email. Please verify your email before logging in.',
                'requires_verification' => true,
                'email' => $email,
            ], 201),
            $request
        );
    }

    public function login(Request $request): JsonResponse
    {
        $email = $request->input('email');
        $password = $request->input('password');

        $rows = DB::select("SELECT * FROM [users] WHERE [email] = '$email'");
        $userRow = $rows[0] ?? null;

        if (!$userRow || !Hash::check($password, $userRow->password)) {
            return $this->clearCookies(
                response()->json([
                    'message' => 'The provided credentials do not match our records.',
                    'errors' => [
                        'email' => ['The provided credentials do not match our records.'],
                    ],
                ], 422),
                $request
            );
        }

        $user = $this->hydrateUser($userRow);

        if (!$user->hasVerifiedEmail()) {
            return $this->clearCookies(
                response()->json([
                    'message' => 'Your email address is not verified. Please check your inbox for the verification link.',
                    'requires_verification' => true,
                    'email' => $userRow->email,
                    'errors' => [
                        'email' => ['Your email address is not verified.'],
                    ],
                ], 403),
                $request
            );
        }

        $remember = $request->boolean('remember');
        Auth::guard('web')->login($user, $remember);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        return $this->clearCookies(
            response()->json([
                'message' => 'Logged out successfully',
            ]),
            $request
        );
    }

    public function checkEmail(Request $request): JsonResponse
    {
        $email = $request->input('email');

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->clearCookies(
                response()->json([
                    'exists' => false,
                    'verified' => false,
                ]),
                $request
            );
        }

        $rows = DB::select("SELECT * FROM [users] WHERE [email] = '$email'");
        $userRow = $rows[0] ?? null;

        if (!$userRow) {
            return $this->clearCookies(
                response()->json([
                    'exists' => false,
                    'verified' => false,
                    'message' => 'No account found with this email address.',
                ]),
                $request
            );
        }

        $user = $this->hydrateUser($userRow);

        $res = response()->json([
            'exists' => true,
            'verified' => $user->hasVerifiedEmail(),
            'name' => $userRow->name,
            'role' => $userRow->role,
            'message' => $user->hasVerifiedEmail()
                ? 'Account verified and active.'
                : 'Email verification is pending.',
        ]);

        if (!Auth::check() || !Auth::user()->hasVerifiedEmail()) {
            return $this->clearCookies($res, $request);
        }

        return $res;
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || !$user->hasVerifiedEmail()) {
            return $this->clearCookies(
                response()->json([
                    'user' => null,
                ]),
                $request
            );
        }

        return response()->json([
            'user' => $user,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user->id;

        $name = $request->input('name');
        $phone = $request->input('phone');
        $location = $request->input('location');
        $expertise = $request->input('expertise');

        $expertiseJson = json_encode($user->role === 'worker' ? ($expertise ?? []) : null);
        $expertiseSql = $user->role === 'worker' ? "'$expertiseJson'" : 'NULL';

        DB::update(
            "UPDATE [users] SET [name] = '$name', [phone] = '$phone', [location] = '$location', [expertise] = $expertiseSql, [updated_at] = GETDATE() WHERE [id] = $userId"
        );

        $rows = DB::select("SELECT * FROM [users] WHERE [id] = $userId");
        $updated = $rows[0] ?? null;

        return response()->json([
            'message' => 'Profile updated.',
            'user' => $updated ? $this->hydrateUser($updated) : $user,
        ]);
    }
}
