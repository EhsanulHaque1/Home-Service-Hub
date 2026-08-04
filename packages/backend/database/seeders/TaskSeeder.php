<?php

namespace Database\Seeders;

use App\Models\Task;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tasks = [
            ['title' => 'Kitchen sink leaking under cabinet', 'description' => 'Water pooling under the sink whenever the dishwasher runs. Needs a plumber to trace and fix the leak.', 'category' => 'Plumbing', 'budget' => 85, 'location' => 'Downtown, 2.1 mi', 'status' => 'open', 'client_name' => 'Priya Shankar', 'client_email' => 'priya.shankar@example.com'],
            ['title' => 'Full apartment deep clean (2BR)', 'description' => 'Move-out clean for a 2 bedroom apartment, including kitchen appliances and both bathrooms.', 'category' => 'Cleaning', 'budget' => 140, 'location' => 'Riverside, 5.4 mi', 'status' => 'matching', 'client_name' => 'Noah Bennett', 'client_email' => 'noah.bennett@example.com'],
            ['title' => 'Replace two faulty light switches', 'description' => 'Two switches in the hallway spark when flipped. Need a licensed electrician to replace them safely.', 'category' => 'Electrical', 'budget' => 60, 'location' => 'Old Town, 1.8 mi', 'status' => 'open', 'client_name' => 'Elena Cruz', 'client_email' => 'elena.cruz@example.com'],
            ['title' => 'Build custom bookshelf in living room', 'description' => 'Floor-to-ceiling bookshelf, roughly 8 feet wide, built to fit an alcove. Materials can be discussed.', 'category' => 'Carpentry', 'budget' => 420, 'location' => 'Maple Heights, 3.6 mi', 'status' => 'open', 'client_name' => 'Marcus Reed', 'client_email' => 'marcus.reed@example.com'],
            ['title' => 'Repaint two bedrooms and hallway', 'description' => 'Fresh coat needed after moving in. Walls are in good condition, just need color change and trim touch-up.', 'category' => 'Painting', 'budget' => 310, 'location' => 'Brookfield, 4.2 mi', 'status' => 'matching', 'client_name' => 'Sofia Lang', 'client_email' => 'sofia.lang@example.com'],
            ['title' => 'Fridge not cooling properly', 'description' => 'Fridge runs but temperature stays warm. Freezer side seems fine. Need a diagnostic and repair.', 'category' => 'Appliance repair', 'budget' => 95, 'location' => 'Greenwood, 6.1 mi', 'status' => 'open', 'client_name' => 'Diego Torres', 'client_email' => 'diego.torres@example.com'],
            ['title' => 'Unclog main bathroom drain', 'description' => 'Shower drains very slowly and the bathtub backs up. Likely needs a snake or hydro jet.', 'category' => 'Plumbing', 'budget' => 70, 'location' => 'Downtown, 1.2 mi', 'status' => 'completed', 'client_name' => 'Aisha Bello', 'client_email' => 'aisha.bello@example.com'],
            ['title' => 'Weekly office cleaning contract', 'description' => 'Small 800 sq ft office suite, looking for a recurring weekly clean including trash and restrooms.', 'category' => 'Cleaning', 'budget' => 90, 'location' => 'Financial District, 3.0 mi', 'status' => 'open', 'client_name' => 'Ravi Patel', 'client_email' => 'ravi.patel@example.com'],
            ['title' => 'Install ceiling fan in bedroom', 'description' => 'Existing light fixture needs to be swapped for a ceiling fan with a wall control.', 'category' => 'Electrical', 'budget' => 130, 'location' => 'Sunset Park, 2.8 mi', 'status' => 'matching', 'client_name' => 'Grace Kim', 'client_email' => 'grace.kim@example.com'],
            ['title' => 'Assemble and mount TV console', 'description' => 'Flat-pack TV console needs assembly and a 55" TV mounted above it on drywall.', 'category' => 'Carpentry', 'budget' => 75, 'location' => 'Old Town, 2.4 mi', 'status' => 'open', 'client_name' => 'Liam Fischer', 'client_email' => 'liam.fischer@example.com'],
            ['title' => 'Exterior fence staining', 'description' => 'Roughly 60 linear feet of wood fence needs cleaning and re-staining before winter.', 'category' => 'Painting', 'budget' => 260, 'location' => 'Brookfield, 5.9 mi', 'status' => 'completed', 'client_name' => 'Hannah Ortiz', 'client_email' => 'hannah.ortiz@example.com'],
            ['title' => 'Washing machine leaking from base', 'description' => 'Water pools under the washer during the spin cycle. Hoses look fine from the outside.', 'category' => 'Appliance repair', 'budget' => 100, 'location' => 'Riverside, 4.7 mi', 'status' => 'open', 'client_name' => 'Owen Walsh', 'client_email' => 'owen.walsh@example.com'],
        ];

        foreach ($tasks as $task) {
            Task::updateOrCreate(['title' => $task['title']], $task);
        }
    }
}
