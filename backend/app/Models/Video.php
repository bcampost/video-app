<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Video extends Model
{
    use HasFactory;

    protected $fillable = ['title','url']; // url = path relativo en 'public'

    public function branches()
    {
        return $this->belongsToMany(Branch::class, 'branch_video')
            ->withPivot(['position'])
            ->withTimestamps()
            ->orderBy('branch_video.position','asc');
    }
}
