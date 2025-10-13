<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('videos', 'url')) {
            Schema::table('videos', function (Blueprint $table) {
                $table->string('url')->nullable()->after('title');
            });
        }
        if (Schema::hasColumn('videos', 'path')) {
            // Copia datos de path -> url
            DB::statement('UPDATE videos SET url = COALESCE(url, path)');
            // Quita la columna path si existe
            Schema::table('videos', function (Blueprint $table) {
                $table->dropColumn('path');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('videos', 'path')) {
            Schema::table('videos', function (Blueprint $table) {
                $table->string('path')->nullable()->after('title');
            });
        }
        // Copia de vuelta si aplica
        DB::statement('UPDATE videos SET path = COALESCE(path, url)');
        // Remueve url si quieres revertir
        Schema::table('videos', function (Blueprint $table) {
            if (Schema::hasColumn('videos', 'url')) {
                $table->dropColumn('url');
            }
        });
    }
};
