<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Complaint extends Model
{
    protected $fillable = [
        'client_name',
        'client_email',
        'worker_name',
        'worker_email',
        'category',
        'description',
        'status',
    ];
}
