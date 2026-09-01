<?php

namespace Tests\Feature;

use App\Models\Feedback;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminFeedbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_fetch_feedback_with_joined_user_and_aggregate_details(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@example.com',
        ]);

        $customer = User::factory()->create([
            'role' => 'client',
            'name' => 'Alice Client',
            'email' => 'alice@example.com',
        ]);

        $this->actingAs($admin, 'sanctum');

        Feedback::create([
            'user_id' => $customer->id,
            'category' => 'General Feedback',
            'message' => 'The dashboard feels slow.',
            'status' => 'open',
        ]);

        Feedback::create([
            'user_id' => $customer->id,
            'category' => 'Bug Report',
            'message' => 'The login button is cut off.',
            'status' => 'resolved',
        ]);

        $response = $this->getJson('/api/admin/feedback');

        $response->assertOk();
        $response->assertJsonPath('0.customer_name', 'Alice Client');
        $response->assertJsonPath('0.total_feedback_by_user', 2);
        $response->assertJsonStructure([
            '*' => [
                'id',
                'category',
                'message',
                'status',
                'customer_name',
                'total_feedback_by_user',
            ],
        ]);
    }
}
