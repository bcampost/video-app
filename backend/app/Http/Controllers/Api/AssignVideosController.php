<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Branch;
use App\Models\BranchPlayback;
use App\Models\BranchQueueItem;

class AssignVideosController extends Controller
{
    public function store(Request $req)
    {
        $data = $req->validate([
            'branch_id'   => 'nullable|integer|exists:branches,id',
            'branch_code' => 'nullable|string|exists:branches,code',
            'video_ids'   => 'required|array',
            'video_ids.*' => 'integer|exists:videos,id',
        ]);

        $branch = $data['branch_id']
            ? Branch::find($data['branch_id'])
            : Branch::where('code', $data['branch_code'] ?? '')->first();

        if (!$branch) {
            return response()->json(['message' => 'Sucursal no encontrada'], 404);
        }

        // 1. Asignar videos a la sucursal (relación many-to-many)
        $branch->videos()->sync($data['video_ids']);

        // 2. Actualizar reproducción para esa sucursal
        $pb = BranchPlayback::firstOrCreate(['branch_id' => $branch->id]);

        $videos = $data['video_ids'];
        $nowVideoId = count($videos) > 0 ? $videos[0] : null;

        // Setear el primer video como "reproduciendo ahora"
        $pb->now_video_id = $nowVideoId;
        $pb->started_at = now();
        $pb->save();

        // Limpiar la cola anterior
        BranchQueueItem::where('branch_playback_id', $pb->id)->delete();

        // Insertar los demás como cola
        foreach (array_slice($videos, 1) as $index => $video_id) {
            BranchQueueItem::create([
                'branch_playback_id' => $pb->id,
                'video_id' => $video_id,
                'order' => $index + 1,
                'added_at' => now(),
            ]);
        }

        return response()->json([
            'ok'     => true,
            'branch' => [
                'id'   => $branch->id,
                'code' => $branch->code,
                'name' => $branch->name
            ],
            'count'  => count($data['video_ids']),
        ]);
    }
}
