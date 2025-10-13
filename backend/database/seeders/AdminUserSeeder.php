<?php

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder {
  public function run(): void {
    User::firstOrCreate(
      ['email' => 'admin@local.test'],
      ['name' => 'Admin', 'password' => Hash::make('secret')]
    );
  }
}
