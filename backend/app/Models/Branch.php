<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
// ✨ Hacemos la Branch autenticable:
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Branch extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'name','code','playback_key','last_seen_at',
        'login_user','login_password',
    ];

    protected $hidden = ['login_password'];

    protected $casts = [
        'last_seen_at' => 'datetime',
    ];

    // Para Sanctum/Guard: nuestra “password” es login_password
    public function getAuthPassword()
    {
        return $this->login_password;
    }

    // El “username” es login_user
    public function getAuthIdentifierName()
    {
        return 'login_user';
    }

    public function videos()
    {
        return $this->belongsToMany(Video::class, 'branch_video')
            ->withPivot(['position'])
            ->withTimestamps()
            ->orderBy('branch_video.position','asc');
    }
}
