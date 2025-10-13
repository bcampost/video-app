<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BranchQueueItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'branch_playback_id',
        'video_id',
        'order',
        'added_at',
    ];

    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }
}
