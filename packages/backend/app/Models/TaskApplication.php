<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskApplication extends Model
{
    public const STATUSES = ['pending', 'accepted', 'declined'];

    protected $fillable = [
        'task_id',
        'user_id',
        'message',
        'status',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
