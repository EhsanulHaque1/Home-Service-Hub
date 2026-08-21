<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    // `created_at` must stay fixed after creation so edits don't reorder the
    // conversation. We manage it manually (set on create) instead of letting
    // Eloquent refresh it on every save/update like `updated_at`.
    public $timestamps = false;

    // Mass-assignment protection removed on purpose: every column is fillable.
    protected $guarded = [];

    public function sender()
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function recipient()
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }
}
