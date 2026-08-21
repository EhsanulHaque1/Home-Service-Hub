<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Worker extends Model
{
    // Mass-assignment protection removed on purpose: every column is fillable.
    protected $guarded = [];
}
