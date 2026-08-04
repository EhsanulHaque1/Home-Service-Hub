<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_successful_login_gets_cookie_invalid_login_gets_no_cookie_and_logout_clears_cookies()
    {
        $headers = ['referer' => 'http://localhost:5173'];

        // 1. Invalid login attempt with non-existent user
        $failedLoginResponse = $this->postJson('/api/login', [
            'email' => 'invalid@example.com',
            'password' => 'wrongpassword',
        ], $headers);

        $failedLoginResponse->assertStatus(422);
        // Cookies should be expired/cleared for invalid login
        $failedLoginResponse->assertCookieExpired(config('session.cookie'));
        $failedLoginResponse->assertCookieExpired('XSRF-TOKEN');

        // 2. Successful Registration
        $registerResponse = $this->postJson('/api/register', [
            'name' => 'Valid User',
            'email' => 'valid@example.com',
            'password' => 'password123',
            'role' => 'client',
            'location' => 'Dhaka',
        ], $headers);

        $registerResponse->assertStatus(201);
        $registerResponse->assertCookieNotExpired(config('session.cookie'));

        // 3. Logout clears cookies
        $logoutResponse = $this->postJson('/api/logout', [], $headers);
        $logoutResponse->assertStatus(200);
        $logoutResponse->assertCookieExpired(config('session.cookie'));
        $logoutResponse->assertCookieExpired('XSRF-TOKEN');

        // 4. Successful Login gets cookies
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'valid@example.com',
            'password' => 'password123',
        ], $headers);

        $loginResponse->assertStatus(200);
        $loginResponse->assertCookieNotExpired(config('session.cookie'));
    }
}
