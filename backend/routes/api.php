<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\VideoController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\BranchPlaybackController;

// Healthcheck
Route::get('/health', fn () => response()->json(['ok' => true, 'ts' => now()->toIso8601String()]));

// --- Público (sin token) ---
// TV obtiene la cola por código
Route::get('/branch/{code}/videos', [BranchPlaybackController::class, 'videosByCode']);
// TV REPORTA qué está reproduciendo ahora
Route::post('/branch/{code}/now-playing', [BranchPlaybackController::class, 'reportNowPlayingByCode']);

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

// --- Protegido ---
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Panel admin/superadmin
    Route::middleware('role:admin,superadmin')->group(function () {
        // Videos
        Route::get   ('/videos',          [VideoController::class, 'index']);
        Route::post  ('/videos',          [VideoController::class, 'store']);
        Route::put   ('/videos/{video}',  [VideoController::class, 'update']);
        Route::delete('/videos/{video}',  [VideoController::class, 'destroy']);

        // Sucursales (ABM + asignación)
        Route::apiResource('branches', BranchController::class)->only(['index','store','update','destroy']);

        // 🔁 AHORA este endpoint lee del estado de reproducción real
        Route::get('/branches/queue-status', [BranchPlaybackController::class, 'getQueueStatusAll']);

        Route::post  ('/branches/{branch}/videos',         [BranchController::class, 'syncVideos']);
        Route::delete('/branches/{branch}/videos',         [BranchController::class, 'clearVideos']);
        Route::delete('/branches/{branch}/videos/{video}', [BranchController::class, 'detachVideo']);
    });
});
