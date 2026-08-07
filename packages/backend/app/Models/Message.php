<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    // `created_at` must stay fixed after creation so edits don't reorder the
    // conversation. We manage it manually (set on create) instead of letting
    // Eloquent refresh it on every save/update like `updated_at`.
    public $timestamps = false;

    protected $fillable = [
        'from_user_id',
        'to_user_id',
        'conversation',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }
}
