<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = ['name', 'code'];

    public function videos()
        {
            return $this->belongsToMany(\App\Models\Video::class, 'branch_video', 'branch_id', 'video_id')
                        ->withTimestamps();
        }


}

