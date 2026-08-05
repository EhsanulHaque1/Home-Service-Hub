<?php

namespace Database\Seeders;

use App\Models\Worker;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class WorkerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $workers = [
            ['name' => 'Marcus Reed', 'trade' => 'Plumbing', 'location' => 'Downtown', 'bio' => 'Licensed plumber with 12 years fixing leaks, fittings, and full repipes.', 'rating' => 4.9, 'jobs_completed' => 312, 'hourly_rate' => 45, 'badge' => 'top'],
            ['name' => 'Aisha Bello', 'trade' => 'Cleaning', 'location' => 'Riverside', 'bio' => 'Detail-oriented residential and office cleaner, available for recurring contracts.', 'rating' => 5.0, 'jobs_completed' => 428, 'hourly_rate' => 30, 'badge' => 'verified'],
            ['name' => 'Diego Torres', 'trade' => 'Electrical', 'location' => 'Greenwood', 'bio' => 'Certified electrician specializing in wiring, panel upgrades, and fixture installs.', 'rating' => 4.8, 'jobs_completed' => 207, 'hourly_rate' => 55, 'badge' => 'top'],
            ['name' => 'Sofia Lang', 'trade' => 'Painting', 'location' => 'Brookfield', 'bio' => 'Interior and exterior painting, color consultations included on every job.', 'rating' => 4.7, 'jobs_completed' => 156, 'hourly_rate' => 38, 'badge' => 'verified'],
            ['name' => 'Owen Walsh', 'trade' => 'Appliance repair', 'location' => 'Riverside', 'bio' => 'Repairs fridges, washers, and dryers for most major brands, same-day diagnostics.', 'rating' => 4.6, 'jobs_completed' => 98, 'hourly_rate' => 50, 'badge' => 'new'],
            ['name' => 'Grace Kim', 'trade' => 'Electrical', 'location' => 'Sunset Park', 'bio' => 'Residential electrician focused on lighting, smart-home wiring, and safety inspections.', 'rating' => 4.9, 'jobs_completed' => 264, 'hourly_rate' => 52, 'badge' => 'top'],
            ['name' => 'Liam Fischer', 'trade' => 'Carpentry', 'location' => 'Old Town', 'bio' => 'Custom furniture, shelving, and general carpentry for apartments and small homes.', 'rating' => 4.8, 'jobs_completed' => 141, 'hourly_rate' => 48, 'badge' => 'verified'],
            ['name' => 'Hannah Ortiz', 'trade' => 'Painting', 'location' => 'Maple Heights', 'bio' => 'Exterior specialist: fences, decks, and siding, plus interior touch-ups.', 'rating' => 4.5, 'jobs_completed' => 76, 'hourly_rate' => 36, 'badge' => 'new'],
            ['name' => 'Ravi Patel', 'trade' => 'Cleaning', 'location' => 'Financial District', 'bio' => 'Commercial and office cleaning crew lead, available for weekly and biweekly plans.', 'rating' => 4.9, 'jobs_completed' => 233, 'hourly_rate' => 34, 'badge' => 'top'],
            ['name' => 'Elena Cruz', 'trade' => 'Plumbing', 'location' => 'Old Town', 'bio' => 'Emergency plumbing response, drain clearing, and fixture replacement.', 'rating' => 4.7, 'jobs_completed' => 189, 'hourly_rate' => 42, 'badge' => 'verified'],
        ];

        foreach ($workers as $worker) {
            Worker::updateOrCreate(['name' => $worker['name'], 'trade' => $worker['trade']], $worker);
        }
    }
}
