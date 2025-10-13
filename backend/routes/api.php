<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\VideoController;
use App\Http\Controllers\Api\BranchController;

// Healthcheck
Route::get('/health', fn () => response()->json(['ok' => true, 'ts' => now()->toIso8601String()]));

// Público
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

// Protegido
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Panel (admin + superadmin)
    Route::middleware('role:admin,superadmin')->group(function () {

        // Videos
        Route::get   ('/videos',            [VideoController::class, 'index']);
        Route::post  ('/videos',            [VideoController::class, 'store']);
        Route::put   ('/videos/{video}',    [VideoController::class, 'update']);
        Route::delete('/videos/{video}',    [VideoController::class, 'destroy']);

        // Sucursales
        Route::apiResource('branches', BranchController::class)->only(['index','store','update','destroy']);
        Route::get('/branches/queue-status', [BranchController::class, 'queueStatus']);

        // 👇 Endpoints para asignar videos a sucursal
        Route::post  ('/branches/{branch}/videos',           [BranchController::class, 'syncVideos']);   // asignar/sincronizar
        Route::delete('/branches/{branch}/videos',           [BranchController::class, 'clearVideos']);  // quitar todos
        Route::delete('/branches/{branch}/videos/{video}',   [BranchController::class, 'detachVideo']);  // quitar uno
    });
});
