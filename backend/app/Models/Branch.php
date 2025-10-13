<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = ['name','code','playback_key','last_seen_at'];

    protected $casts = [
        'last_seen_at' => 'datetime',
    ];

    public function videos()
    {
        return $this->belongsToMany(Video::class, 'branch_video')
            ->withPivot(['position'])
            ->withTimestamps()
            ->orderBy('branch_video.position','asc');
    }
}
