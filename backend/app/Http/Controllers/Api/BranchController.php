<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Video;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BranchController extends Controller
{
    public function index()
    {
        $branches = Branch::withCount('videos')
            ->orderBy('name')
            ->get(['id','name','code','playback_key','last_seen_at']);

        return response()->json(['data' => $branches]);
    }

    public function store(Request $request)
    {
        $payload = $request->validate([
            'name' => ['required','string','max:255'],
            'code' => ['required','string','max:50','unique:branches,code'],
        ]);

        $branch = Branch::create($payload);

        return response()->json([
            'message' => 'Sucursal creada',
            'data'    => $branch,
        ], 201);
    }

    public function update(Request $request, Branch $branch)
    {
        $payload = $request->validate([
            'name' => ['required','string','max:255'],
            'code' => [
                'required','string','max:50',
                Rule::unique('branches','code')->ignore($branch->id),
            ],
        ]);

        $branch->fill($payload)->save();

        return response()->json([
            'message' => 'Sucursal actualizada',
            'data'    => $branch->fresh(),
        ]);
    }

    public function destroy(Branch $branch)
    {
        try { $branch->videos()->detach(); } catch (\Throwable $e) {}
        $branch->delete();
        return response()->noContent(); // 204
    }

    public function queueStatus()
    {
        $branches = Branch::select('id','name','code')
            ->with([
                'videos' => function ($q) {
                    $q->select('videos.id','videos.title')
                      ->orderBy('branch_video.position','asc');
                }
            ])
            ->orderBy('name')
            ->get();

        $data = $branches->map(function ($b) {
            return [
                'branch' => ['id'=>$b->id,'name'=>$b->name,'code'=>$b->code],
                'queue'  => $b->videos->map(fn($v) => [
                    'id'       => $v->id,
                    'title'    => $v->title,
                    'position' => (int)($v->pivot->position ?? 0),
                ])->values(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    }

    /**
     * Sincroniza los videos asignados a una sucursal.
     * Body: { "video_ids": [1,2,3] }
     * La posición quedará según el orden del array (1..n).
     */
    public function syncVideos(Request $request, Branch $branch)
    {
        $data = $request->validate([
            'video_ids'   => ['required','array'],
            'video_ids.*' => ['integer','exists:videos,id'],
        ]);

        $ids = array_values(array_unique($data['video_ids']));

        DB::transaction(function () use ($branch, $ids) {
            $sync = [];
            foreach ($ids as $i => $videoId) {
                $sync[$videoId] = ['position' => $i + 1];
            }
            $branch->videos()->sync($sync); // quita los que no estén y actualiza posiciones
        });

        return response()->json([
            'message' => 'Asignación actualizada',
            'data' => [
                'branch_id' => $branch->id,
                'count'     => count($ids),
            ],
        ]);
    }

    /**
     * Quita todos los videos de una sucursal.
     */
    public function clearVideos(Branch $branch)
    {
        $branch->videos()->detach();
        return response()->noContent(); // 204
    }

    /**
     * Quita un video específico de la sucursal.
     */
    public function detachVideo(Branch $branch, Video $video)
    {
        $branch->videos()->detach($video->id);
        return response()->noContent(); // 204
    }
}
