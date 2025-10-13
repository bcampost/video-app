<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateBranchQueueItemsTable extends Migration
{
    public function up(): void
    {
        Schema::create('branch_queue_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_playback_id')->constrained()->onDelete('cascade');
            $table->foreignId('video_id')->constrained()->onDelete('cascade');
            $table->unsignedInteger('order')->default(1);
            $table->timestamp('added_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_queue_items');
    }
}
