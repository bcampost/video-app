<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\VideoController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\BranchPlaybackController;
use App\Http\Controllers\Api\BranchAuthController;

// Healthcheck
Route::get('/health', fn () => response()->json(['ok' => true, 'ts' => now()->toIso8601String()]));

// Público: TV obtiene cola y login sucursal
Route::get('/branch/{code}/videos', [BranchPlaybackController::class, 'videosByCode']);
Route::post('/branch/login',        [BranchAuthController::class, 'login']);

// Público de auth de usuarios regulares (si lo usas)
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

// Protegido
Route::middleware('auth:sanctum')->group(function () {

    // Logout admin y logout branch
    Route::post('/auth/logout',     [AuthController::class, 'logout']);
    Route::post('/branch/logout',   [BranchAuthController::class, 'logout']);

    // Panel admin/superadmin
    Route::middleware('role:admin,superadmin')->group(function () {
        // Videos
        Route::get   ('/videos',         [VideoController::class, 'index']);
        Route::post  ('/videos',         [VideoController::class, 'store']);
        Route::put   ('/videos/{video}', [VideoController::class, 'update']);
        Route::delete('/videos/{video}', [VideoController::class, 'destroy']);

        // Sucursales
        Route::apiResource('branches', BranchController::class)->only(['index','store','update','destroy']);
        Route::get('/branches/queue-status', [BranchPlaybackController::class, 'getQueueStatusAll']);

        // Asignación de videos
        Route::post  ('/branches/{branch}/videos',         [BranchController::class, 'syncVideos']);
        Route::delete('/branches/{branch}/videos',         [BranchController::class, 'clearVideos']);
        Route::delete('/branches/{branch}/videos/{video}', [BranchController::class, 'detachVideo']);

        // Credenciales de sucursal (usuario/contraseña)
        Route::put('/branches/{branch}/credentials', [BranchController::class, 'updateCredentials']);
    });

    // Heartbeat del reproductor (si lo quieres protegido con token de branch)
    Route::post('/playback/branch/{code}/heartbeat', [BranchPlaybackController::class, 'heartbeatByCode']);
});
