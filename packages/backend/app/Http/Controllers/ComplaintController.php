<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use Illuminate\Http\Request;

class ComplaintController extends Controller
{
    public const CATEGORIES = [
        'Late arrival',
        'Poor work quality',
        'Unprofessional behavior',
        'Overcharging',
        'No-show',
        'Other',
    ];

    public function index()
    {
        return Complaint::latest()->paginate(15);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_name' => ['required', 'string', 'max:255'],
            'client_email' => ['required', 'email', 'max:255'],
            'worker_name' => ['required', 'string', 'max:255'],
            'worker_email' => ['nullable', 'email', 'max:255'],
            'category' => ['required', 'string', 'in:' . implode(',', self::CATEGORIES)],
            'description' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $complaint = Complaint::create($validated);

        return response()->json($complaint, 201);
    }
}
