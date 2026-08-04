<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Worker extends Model
{
    protected $fillable = [
        'name',
        'trade',
        'location',
        'bio',
        'rating',
        'jobs_completed',
        'hourly_rate',
        'badge',
    ];

    protected $casts = [
        'rating' => 'float',
        'hourly_rate' => 'float',
        'jobs_completed' => 'integer',
    ];
}
