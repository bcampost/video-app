<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Branch;
use App\Models\Video;

class BranchVideoController extends Controller
{
    /**
     * Obtener los videos asignados a una sucursal por su código.
     */
    public function getVideos($code)
    {
        $branch = Branch::where('code', $code)->first();

        if (!$branch) {
            return response()->json(['error' => 'Sucursal no encontrada'], 404);
        }

        $videos = $branch->videos()->get([
            'videos.id',
            'videos.title',
            'videos.filename'
        ]);

        return response()->json([
            'branch' => $branch->name,
            'videos' => $videos,
        ]);
    }

    /**
     * Asignar una lista de videos a una sucursal (por ID).
     */
    public function assignVideos(Request $request, $branch_id)
    {
        $request->validate([
            'video_ids' => 'required|array',
            'video_ids.*' => 'integer|exists:videos,id',
        ]);

        $branch = Branch::find($branch_id);

        if (!$branch) {
            return response()->json(['error' => 'Sucursal no encontrada'], 404);
        }

        // Asignar los videos seleccionados (reemplaza los existentes)
        $branch->videos()->sync($request->video_ids);

        $videos = $branch->videos()->get([
            'videos.id',
            'videos.title',
            'videos.filename'
        ]);

        return response()->json([
            'message' => 'Videos asignados correctamente',
            'branch' => $branch->name,
            'videos' => $videos,
        ]);
    }

    public function getQueueStatus()
        {
            $branches = \App\Models\Branch::with(['videos' => function ($query) {
                $query->orderBy('created_at'); // o cualquier lógica de orden que defina la cola
            }])->get();

            $result = $branches->map(function ($branch) {
                return [
                    'branch' => $branch->name,
                    'code' => $branch->code,
                    'current_video' => $branch->videos->first(),
                    'queue' => $branch->videos->slice(1)->values(), // excluye el primero
                ];
            });

            return response()->json($result);
        }

    public function getBranchQueues()
        {
            $branches = Branch::with(['videos' => function ($query) {
                $query->select('videos.id', 'title', 'filename');
            }])->get(['id', 'name', 'code']);

            return response()->json($branches);
        }


}
