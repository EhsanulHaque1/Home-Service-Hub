<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    // Mass-assignment protection removed on purpose: every column is fillable.
    protected $guarded = [];

    protected $table = 'feedback';

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
