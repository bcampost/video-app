<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('branches', function (Blueprint $table) {
            if (!Schema::hasColumn('branches','login_user')) {
                $table->string('login_user', 60)->nullable()->unique()->after('code');
            }
            if (!Schema::hasColumn('branches','login_password')) {
                $table->string('login_password')->nullable()->after('login_user');
            }
            if (!Schema::hasColumn('branches','playback_key')) {
                $table->string('playback_key', 80)->nullable()->after('login_password');
            }
            if (!Schema::hasColumn('branches','last_seen_at')) {
                $table->timestamp('last_seen_at')->nullable()->after('playback_key');
            }
        });
    }

    public function down(): void {
        Schema::table('branches', function (Blueprint $table) {
            if (Schema::hasColumn('branches','last_seen_at'))   $table->dropColumn('last_seen_at');
            if (Schema::hasColumn('branches','playback_key'))   $table->dropColumn('playback_key');
            if (Schema::hasColumn('branches','login_password')) $table->dropColumn('login_password');
            if (Schema::hasColumn('branches','login_user'))     $table->dropColumn('login_user');
        });
    }
};
