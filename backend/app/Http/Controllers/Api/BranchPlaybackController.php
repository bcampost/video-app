<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BranchPlayback;
use App\Models\BranchQueueItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BranchPlaybackController extends Controller
{
    /**
     * Devuelve el estado de todas las sucursales (para el panel admin)
     */
    public function getQueueStatusAll()
    {
        try {
            $playbacks = BranchPlayback::with([
                'branch:id,name,code',
                'nowVideo:id,title',
                'queueItems.video:id,title'
            ])->get();

            if ($playbacks->isEmpty()) {
                // Si no hay playbacks, devolvemos las sucursales igual
                $branches = Branch::select('id', 'name', 'code')->get();
                return response()->json($branches->map(fn($b) => [
                    'branch' => $b,
                    'now_playing' => null,
                    'queue' => [],
                ]));
            }

            $response = $playbacks->map(function ($pb) {
                return [
                    'branch' => [
                        'id' => $pb->branch->id ?? null,
                        'name' => $pb->branch->name ?? 'Sin nombre',
                        'code' => $pb->branch->code ?? 'N/A',
                    ],
                    'now_playing' => $pb->nowVideo ? [
                        'id' => $pb->nowVideo->id,
                        'title' => $pb->nowVideo->title,
                    ] : null,
                    'queue' => $pb->queueItems->map(fn($qi) => [
                        'id' => $qi->video->id ?? null,
                        'title' => $qi->video->title ?? 'Desconocido',
                    ]),
                ];
            });

            return response()->json($response);
        } catch (\Throwable $e) {
            Log::error('Error en getQueueStatusAll: ' . $e->getMessage());
            return response()->json(['error' => 'Error interno del servidor'], 500);
        }
    }

    /**
     * Devuelve el estado de una sucursal específica por código (modo TV)
     */
    public function getQueueStatusByCode($code)
    {
        try {
            $branch = Branch::where('code', $code)->firstOrFail();

            $pb = BranchPlayback::with([
                'nowVideo:id,title',
                'queueItems.video:id,title'
            ])->where('branch_id', $branch->id)->first();

            if (!$pb) {
                return response()->json([
                    'branch' => $branch,
                    'now_playing' => null,
                    'queue' => [],
                ]);
            }

            return response()->json([
                'branch' => $branch,
                'now_playing' => $pb->nowVideo ? [
                    'id' => $pb->nowVideo->id,
                    'title' => $pb->nowVideo->title,
                ] : null,
                'queue' => $pb->queueItems->map(fn($qi) => [
                    'id' => $qi->video->id ?? null,
                    'title' => $qi->video->title ?? 'Desconocido',
                ]),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en getQueueStatusByCode: ' . $e->getMessage());
            return response()->json(['error' => 'Error interno del servidor'], 500);
        }
    }

    /**
     * Admin: setea el video actual y la cola
     */
    public function setQueueForBranch(Request $request, $branch_id)
    {
        $request->validate([
            'now_video_id' => 'nullable|exists:videos,id',
            'queue' => 'array',
            'queue.*' => 'exists:videos,id',
        ]);

        $branch = Branch::findOrFail($branch_id);
        $pb = BranchPlayback::firstOrCreate(['branch_id' => $branch->id]);

        $pb->now_video_id = $request->input('now_video_id');
        $pb->started_at = now();
        $pb->save();

        BranchQueueItem::where('branch_playback_id', $pb->id)->delete();

        foreach ($request->input('queue', []) as $index => $video_id) {
            BranchQueueItem::create([
                'branch_playback_id' => $pb->id,
                'video_id' => $video_id,
                'order' => $index + 1,
                'added_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Queue updated']);
    }

    /**
     * Admin: avanzar al siguiente video (pop)
     */
    public function advanceToNext($branch_id)
    {
        $branch = Branch::findOrFail($branch_id);
        $pb = BranchPlayback::with('queueItems')->where('branch_id', $branch->id)->firstOrFail();

        $nextItem = $pb->queueItems()->orderBy('order')->first();
        if (!$nextItem) {
            $pb->now_video_id = null;
            $pb->save();
            return response()->json(['message' => 'Queue is empty now']);
        }

        $pb->now_video_id = $nextItem->video_id;
        $pb->started_at = now();
        $pb->save();

        $nextItem->delete();

        $remaining = BranchQueueItem::where('branch_playback_id', $pb->id)
            ->orderBy('order')->get();

        $remaining->each(function ($item, $idx) {
            $item->order = $idx + 1;
            $item->save();
        });

        return response()->json(['message' => 'Advanced to next video']);
    }
}
