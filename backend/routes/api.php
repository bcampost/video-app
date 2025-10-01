<?php

use Illuminate\Support\Facades\Route;

// Controladores (namespace Api)
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\VideoController;
use App\Http\Controllers\Api\BranchVideoController;
use App\Http\Controllers\Api\AssignVideosController;

/*
|--------------------------------------------------------------------------
| Rutas Públicas
|--------------------------------------------------------------------------
*/

// Login
Route::post('/login', [AuthController::class, 'login'])->name('api.login');

// Lista de sucursales (pública)
Route::get('/branches', [BranchController::class, 'index'])->name('api.branches.index');

// Ver videos asignados a una sucursal por CÓDIGO (vista pública/TV)
Route::get('/branch/{code}/videos', [BranchVideoController::class, 'getVideos'])
    ->where('code', '.*')
    ->name('api.branch.videos');

/*
|--------------------------------------------------------------------------
| Rutas Protegidas (Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
    Route::get('/user', [AuthController::class, 'userProfile'])->name('api.user');

    // --- Gestión de Sucursales ---
    Route::post('/branches', [BranchController::class, 'store'])->name('api.branches.store');
    Route::put('/branches/{id}', [BranchController::class, 'update'])->name('api.branches.update');
    Route::delete('/branches/{id}', [BranchController::class, 'destroy'])->name('api.branches.destroy');

    // --- Gestión de Videos Globales ---
    Route::get('/videos', [VideoController::class, 'index'])->name('api.videos.index');
    Route::post('/videos', [VideoController::class, 'store'])->name('api.videos.store');
    Route::put('/videos/{id}', [VideoController::class, 'update'])->name('api.videos.update');
    Route::delete('/videos/{id}', [VideoController::class, 'destroy'])->name('api.videos.destroy');

    // --- Asignación de Videos a Sucursales ---
    // Opción A: endpoint genérico con payload { branch_id | branch_code, video_ids[] }
    Route::post('/assign-videos', [AssignVideosController::class, 'store'])->name('api.assign-videos');

    // Opción B: por ID en URL (compatibilidad con lo que ya tenías)
    Route::post('/branch/{branch_id}/assign-videos', [BranchVideoController::class, 'assignVideos'])
        ->whereNumber('branch_id')
        ->name('api.branch.assign-videos');

    // Estado/cola por sucursal (para tu panel derecho)
    Route::get('/branches/queue-status', [BranchVideoController::class, 'getQueueStatus'])
        ->name('api.branches.queue-status');
});
