<?php

namespace App\Http\Controllers;

use App\Mail\WelcomeEmail;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;

class AuthController extends Controller
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
     * Register a new user and send an email verification link.
     * Enforces NO authentication or session cookies issued to unverified user.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(['client', 'worker'])],
            'phone' => ['nullable', 'string', 'max:50'],
            'location' => ['required', 'string', 'max:255'],
            'expertise' => [Rule::requiredIf($request->role === 'worker'), 'array', 'min:1'],
            'expertise.*' => ['string', Rule::in(Task::CATEGORIES)],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'location' => $validated['location'],
            'expertise' => $validated['role'] === 'worker' ? ($validated['expertise'] ?? []) : null,
        ]);

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
                'email' => $user->email,
            ], 201),
            $request
        );
    }

    /**
     * Log in an existing user and create an authenticated cookie session.
     * Enforces NO session or auth cookies are issued unless:
     * 1. Credentials (email and password) are valid.
     * 2. Email address is verified.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        // 1. Check credentials WITHOUT logging in or setting session/cookies
        if (!Auth::guard('web')->validate($credentials)) {
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

        $user = User::where('email', $credentials['email'])->first();

        // 2. Block login and wipe any cookies if email is unverified
        if ($user && !$user->hasVerifiedEmail()) {
            return $this->clearCookies(
                response()->json([
                    'message' => 'Your email address is not verified. Please check your inbox for the verification link.',
                    'requires_verification' => true,
                    'email' => $user->email,
                    'errors' => [
                        'email' => ['Your email address is not verified.'],
                    ],
                ], 403),
                $request
            );
        }

        // 3. ONLY after credential validation and email verification succeed, perform login & issue session cookie
        $remember = $request->boolean('remember');
        Auth::guard('web')->login($user, $remember);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
        ]);
    }

    /**
     * Log out the current user and invalidate the cookie session.
     */
    public function logout(Request $request): JsonResponse
    {
        return $this->clearCookies(
            response()->json([
                'message' => 'Logged out successfully',
            ]),
            $request
        );
    }

    /**
     * Real-time check of user account existence and email verification status.
     * Enforces NO cookie issuance for unauthenticated / unverified guests.
     */
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

        $user = User::where('email', $email)->first();

        if (!$user) {
            return $this->clearCookies(
                response()->json([
                    'exists' => false,
                    'verified' => false,
                    'message' => 'No account found with this email address.',
                ]),
                $request
            );
        }

        $res = response()->json([
            'exists' => true,
            'verified' => $user->hasVerifiedEmail(),
            'name' => $user->name,
            'role' => $user->role,
            'message' => $user->hasVerifiedEmail()
                ? 'Account verified and active.'
                : 'Email verification is pending.',
        ]);

        if (!Auth::check() || !Auth::user()->hasVerifiedEmail()) {
            return $this->clearCookies($res, $request);
        }

        return $res;
    }

    /**
     * Get the authenticated user.
     * Enforces NO cookies returned if user is guest or unverified.
     */
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

    /**
     * Update the authenticated user's profile details.
     * Email and role are intentionally not editable here.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'location' => ['required', 'string', 'max:255'],
            'expertise' => [Rule::requiredIf($user->role === 'worker'), 'array', 'min:1'],
            'expertise.*' => ['string', Rule::in(Task::CATEGORIES)],
        ]);

        $user->update([
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
            'location' => $validated['location'],
            'expertise' => $user->role === 'worker' ? ($validated['expertise'] ?? []) : null,
        ]);

        return response()->json([
            'message' => 'Profile updated.',
            'user' => $user->fresh(),
        ]);
    }
}
