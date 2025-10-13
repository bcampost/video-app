<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('videos', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            // Guardamos el PATH relativo en disco 'public' (p.ej. videos/abc.mp4)
            $table->string('url');
            $table->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('videos');
    }
};
