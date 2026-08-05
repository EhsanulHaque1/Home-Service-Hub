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

    // open -> matching (someone applied) -> assigned (client confirmed a worker) -> completed
    public const STATUSES = ['open', 'matching', 'assigned', 'completed'];

    protected $fillable = [
        'user_id',
        'assigned_worker_id',
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

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function assignedWorker()
    {
        return $this->belongsTo(User::class, 'assigned_worker_id');
    }

    public function applications()
    {
        return $this->hasMany(TaskApplication::class);
    }
}
