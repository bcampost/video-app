<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('branch_video', function (Blueprint $table) {
            $table->id(); // (opcional, puedes quitarlo si prefieres PK compuesta)
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('video_id')->constrained('videos')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['branch_id','video_id']); // evita duplicados
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_video');
    }
};
