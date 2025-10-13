<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BranchPlayback extends Model
{
    protected $fillable = [
        'branch_id',
        'now_video_id',
        'started_at',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function nowVideo(): BelongsTo
    {
        return $this->belongsTo(Video::class, 'now_video_id');
    }

    public function queueItems(): HasMany
    {
        return $this->hasMany(BranchQueueItem::class);
    }
}
