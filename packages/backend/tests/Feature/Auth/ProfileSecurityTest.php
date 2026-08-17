<?php

namespace Tests\Feature\Auth;

use App\Mail\SecurityVerificationMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ProfileSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_send_security_code_for_password_change(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'password' => 'oldpassword123',
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($user)->postJson('/api/profile/security-code', [
            'action' => 'change_password',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'action' => 'change_password',
        ]);

        Mail::assertSent(SecurityVerificationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email) && $mail->action === 'change_password';
        });

        $this->assertTrue(Cache::has("security_code_{$user->id}_change_password"));
    }

    public function test_security_code_request_has_cooldown(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        // First request succeeds
        $this->actingAs($user)->postJson('/api/profile/security-code', [
            'action' => 'change_password',
        ])->assertStatus(200);

        // Immediate second request gets 429 cooldown
        $secondResponse = $this->actingAs($user)->postJson('/api/profile/security-code', [
            'action' => 'change_password',
        ]);

        $secondResponse->assertStatus(429);
    }

    public function test_cannot_change_password_with_invalid_current_password(): void
    {
        $user = User::factory()->create([
            'password' => 'correctpassword123',
            'email_verified_at' => now(),
        ]);

        Cache::put("security_code_{$user->id}_change_password", '123456', now()->addMinutes(10));

        $response = $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'wrongpassword',
            'password' => 'newsecretpassword123',
            'password_confirmation' => 'newsecretpassword123',
            'verification_code' => '123456',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['current_password']);
    }

    public function test_cannot_change_password_with_invalid_verification_code(): void
    {
        $user = User::factory()->create([
            'password' => 'correctpassword123',
            'email_verified_at' => now(),
        ]);

        Cache::put("security_code_{$user->id}_change_password", '123456', now()->addMinutes(10));

        $response = $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'correctpassword123',
            'password' => 'newsecretpassword123',
            'password_confirmation' => 'newsecretpassword123',
            'verification_code' => '999999',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['verification_code']);
    }

    public function test_can_change_password_successfully_with_valid_code_and_password(): void
    {
        $user = User::factory()->create([
            'password' => 'correctpassword123',
            'email_verified_at' => now(),
        ]);

        Cache::put("security_code_{$user->id}_change_password", '123456', now()->addMinutes(10));

        $response = $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'correctpassword123',
            'password' => 'brandnewpassword123',
            'password_confirmation' => 'brandnewpassword123',
            'verification_code' => '123456',
        ]);

        $response->assertStatus(200);
        $this->assertTrue(Hash::check('brandnewpassword123', $user->fresh()->password));
        $this->assertFalse(Cache::has("security_code_{$user->id}_change_password"));
    }

    public function test_can_delete_account_with_valid_password_and_code(): void
    {
        $user = User::factory()->create([
            'password' => 'passwordtodelete123',
            'email_verified_at' => now(),
        ]);

        Cache::put("security_code_{$user->id}_delete_account", '654321', now()->addMinutes(10));

        $response = $this->actingAs($user)->deleteJson('/api/profile/account', [
            'password' => 'passwordtodelete123',
            'verification_code' => '654321',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }
}
