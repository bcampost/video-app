<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasColumn('videos', 'branch_code')) {
            Schema::table('videos', function (Blueprint $table) {
                $table->string('branch_code')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('videos', 'branch_code')) {
            Schema::table('videos', function (Blueprint $table) {
                $table->string('branch_code')->nullable(false)->change();
            });
        }
    }
};
