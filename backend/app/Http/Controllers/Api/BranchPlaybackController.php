<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BranchPlayback;
use App\Models\BranchQueueItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;


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
                $branches = Branch::select('id', 'name', 'code')->get();
                return response()->json($branches->map(fn($b) => [
                    'branch'      => $b,
                    'now_playing' => null,
                    'queue'       => [],
                ]));
            }

            $response = $playbacks->map(function ($pb) {
                return [
                    'branch' => [
                        'id'   => $pb->branch->id ?? null,
                        'name' => $pb->branch->name ?? 'Sin nombre',
                        'code' => $pb->branch->code ?? 'N/A',
                    ],
                    'now_playing' => $pb->nowVideo ? [
                        'id'    => $pb->nowVideo->id,
                        'title' => $pb->nowVideo->title,
                    ] : null,
                    'queue' => $pb->queueItems->map(fn($qi) => [
                        'id'    => $qi->video->id ?? null,
                        'title' => $qi->video->title ?? 'Desconocido',
                    ])->values(),
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
                    'branch'      => $branch,
                    'now_playing' => null,
                    'queue'       => [],
                ]);
            }

            return response()->json([
                'branch'      => $branch,
                'now_playing' => $pb->nowVideo ? [
                    'id'    => $pb->nowVideo->id,
                    'title' => $pb->nowVideo->title,
                ] : null,
                'queue' => $pb->queueItems->map(fn($qi) => [
                    'id'    => $qi->video->id ?? null,
                    'title' => $qi->video->title ?? 'Desconocido',
                ])->values(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en getQueueStatusByCode: ' . $e->getMessage());
            return response()->json(['error' => 'Error interno del servidor'], 500);
        }
    }

    


    /**
     * NUEVO: Cola reproducible por código (lo que consume tu BranchView.jsx)
     * GET /api/branch/{code}/videos
     * Respuesta: { branch:{id,name,code}, videos:[{id,title,filename|file|path|url}] }
     */
public function videosByCode(string $code)
{
    // 1) Sucursal por código
    $branch = Branch::where('code', $code)->firstOrFail();

    // 2) Columnas disponibles en la tabla videos (evita 1054)
    $cols = ['videos.id', 'videos.title'];
    foreach (['filename', 'path', 'file_path', 'url'] as $c) {
        if (Schema::hasColumn('videos', $c)) {
            $cols[] = "videos.$c";
        }
    }

    // 3) Traemos por la relación pivot (branch_video.position ASC)
    $videos = $branch->videos()
        ->orderBy('branch_video.position', 'asc')
        ->get($cols);

    // 4) Normalización compatible con tu BranchView.jsx
    $list = $videos->map(function ($v) {
        // Detecta qué campo de archivo existe
        $fileLike = $v->filename
            ?? $v->file_path
            ?? $v->path
            ?? null;

        return [
            'id'       => $v->id,
            'title'    => $v->title,
            // Tu BranchView acepta cualquiera de estos:
            'filename' => $fileLike,
            'file'     => $v->file_path ?? null,
            'path'     => $v->path ?? null,
            'url'      => $v->url ?? null,
        ];
    })->values();

    return response()->json([
        'branch' => [
            'id'   => $branch->id,
            'name' => $branch->name,
            'code' => $branch->code,
        ],
        'videos' => $list,
    ]);
}



    /**
     * Admin: setea el video actual y la cola
     */
    public function setQueueForBranch(Request $request, $branch_id)
    {
        $request->validate([
            'now_video_id' => 'nullable|exists:videos,id',
            'queue'        => 'array',
            'queue.*'      => 'exists:videos,id',
        ]);

        $branch = Branch::findOrFail($branch_id);
        $pb = BranchPlayback::firstOrCreate(['branch_id' => $branch->id]);

        $pb->now_video_id = $request->input('now_video_id');
        $pb->started_at   = now();
        $pb->save();

        BranchQueueItem::where('branch_playback_id', $pb->id)->delete();

        foreach ($request->input('queue', []) as $index => $video_id) {
            BranchQueueItem::create([
                'branch_playback_id' => $pb->id,
                'video_id'           => $video_id,
                'order'              => $index + 1,
                'added_at'           => now(),
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
        $pb->started_at   = now();
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

public function reportNowPlaying(Request $request, string $code)
{
    $data = $request->validate([
        'video_id' => 'required|integer|exists:videos,id',
    ]);

    $branch = Branch::where('code', $code)->firstOrFail();
    $pb = BranchPlayback::firstOrCreate(['branch_id' => $branch->id]);

    $vid = (int) $data['video_id'];

    // Si el tope de la cola coincide con el que se empezó a reproducir: lo sacamos
    $head = $pb->queueItems()->orderBy('order')->first();
    if ($head && (int) $head->video_id === $vid) {
        $head->delete();

        // Reindexar la cola
        $pb->queueItems()->orderBy('order')->get()->each(function ($item, $i) {
            $item->order = $i + 1;
            $item->save();
        });
    } else {
        // Por si ese video estaba en algún lugar de la cola, lo eliminamos para no duplicar
        $pb->queueItems()->where('video_id', $vid)->delete();
    }

    // Actualizar el "now playing" si cambió
    if ($pb->now_video_id !== $vid) {
        $pb->now_video_id = $vid;
        $pb->started_at   = now();
        $pb->save();
    }

    // Opcional: marcar que esta sucursal está viva
    try {
        $branch->last_seen_at = now();
        $branch->save();
    } catch (\Throwable $e) {}

    return response()->json(['ok' => true]);
}

public function heartbeatByCode(Request $request, string $code)
{
    try {
        $branch = Branch::where('code', $code)->firstOrFail();

        $pb = BranchPlayback::firstOrCreate(['branch_id' => $branch->id]);
        $videoId = $request->integer('video_id');

        // Marca qué video está sonando y desde cuándo
        $pb->now_video_id = $videoId ?: null;
        $pb->started_at   = now();
        $pb->save();

        return response()->json(['ok' => true]);
    } catch (\Throwable $e) {
        Log::error('heartbeatByCode: ' . $e->getMessage());
        return response()->json(['ok' => false], 500);
    }
}



}
