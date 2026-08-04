<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    public const CATEGORIES = [
        'Plumbing',
        'Cleaning',
        'Electrical',
        'Carpentry',
        'Painting',
        'Appliance repair',
    ];

    protected $fillable = [
        'title',
        'description',
        'category',
        'budget',
        'location',
        'status',
        'client_name',
        'client_email',
    ];

    protected $casts = [
        'budget' => 'float',
    ];
}
