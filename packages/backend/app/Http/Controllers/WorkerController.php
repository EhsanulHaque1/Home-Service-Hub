<?php

namespace App\Http\Controllers;

use App\Models\Worker;
use Illuminate\Http\Request;

class WorkerController extends Controller
{
    public function index(Request $request)
    {
        $query = Worker::query()->orderByDesc('rating');

        if ($request->filled('trade')) {
            $query->where('trade', $request->string('trade'));
        }

        return $query->paginate(12);
    }

    public function show(Worker $worker)
    {
        return $worker;
    }
}
