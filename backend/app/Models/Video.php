<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Video extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'filename',
    ];

    /**
     * Relación muchos a muchos con sucursales (branches)
     */
    public function branches()
       {
            return $this->belongsToMany(\App\Models\Branch::class, 'branch_video', 'video_id', 'branch_id')
                        ->withTimestamps();
        }


}
