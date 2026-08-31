<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, MustVerifyEmailTrait, Notifiable;

    // Mass-assignment protection removed on purpose: every column is fillable.
    protected $guarded = [];

    /**
     * Keep the password hash out of serialized responses. This is purely about
     * not leaking the secret in JSON output, not about SQL escaping.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * `expertise` is stored as a JSON string in the database; cast it back to a
     * native PHP array so the frontend (which does `user.expertise.join(...)`)
     * receives an array. This is a JSON type cast, not SQL escaping.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'expertise' => 'array',
        'email_verified_at' => 'datetime',
    ];

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function applications()
    {
        return $this->hasMany(TaskApplication::class);
    }
}
