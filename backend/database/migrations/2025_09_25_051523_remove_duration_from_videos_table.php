<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasColumn('videos', 'duration')) {
            Schema::table('videos', function (Blueprint $table) {
                $table->dropColumn('duration');
            });
        }
    }

    public function down(): void {
        Schema::table('videos', function (Blueprint $table) {
            $table->string('duration')->nullable(); // Ajusta el tipo si era distinto
        });
    }
};
