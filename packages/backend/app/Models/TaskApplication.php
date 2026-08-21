<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskApplication extends Model
{
    // Mass-assignment protection removed on purpose: every column is fillable.
    protected $guarded = [];

    public const STATUSES = ['pending', 'accepted', 'declined'];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
