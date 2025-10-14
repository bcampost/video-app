<?php

// database/migrations/2025_10_13_000000_add_playback_fields_to_branches.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('playback_user', 60)->nullable()->after('code');
            $table->string('playback_password')->nullable()->after('playback_user');
        });
    }
    public function down(): void {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn(['playback_user','playback_password']);
        });
    }
};
