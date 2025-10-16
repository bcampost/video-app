<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'playback_key',
        'login_user',
        'login_password',
        'last_seen_at',
    ];

    /**
     * Cola de videos por sucursal con orden explícito en la tabla pivote.
     * Tabla pivote: branch_video (branch_id, video_id, position, timestamps)
     */
    public function videos()
    {
        return $this->belongsToMany(Video::class, 'branch_video')
            ->withPivot(['position'])
            ->withTimestamps()
            ->orderBy('branch_video.position', 'asc');
    }
}
