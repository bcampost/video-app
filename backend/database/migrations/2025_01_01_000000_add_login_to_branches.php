<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            if (!Schema::hasColumn('branches', 'login_user')) {
                $table->string('login_user')->nullable()->unique()->after('code');
            }
            if (!Schema::hasColumn('branches', 'login_password')) {
                $table->string('login_password')->nullable()->after('login_user');
            }
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            if (Schema::hasColumn('branches', 'login_user')) {
                $table->dropUnique(['login_user']);
                $table->dropColumn('login_user');
            }
            if (Schema::hasColumn('branches', 'login_password')) {
                $table->dropColumn('login_password');
            }
        });
    }
};
