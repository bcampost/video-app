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
            ->get(['id','name','code','login_user','playback_key','last_seen_at']); // << importante: login_user

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
            $branch->videos()->sync($sync);
        });

        return response()->json([
            'message' => 'Asignación actualizada',
            'data' => [
                'branch_id' => $branch->id,
                'count'     => count($ids),
            ],
        ]);
    }

    public function clearVideos(Branch $branch)
    {
        $branch->videos()->detach();
        return response()->noContent(); // 204
    }

    public function detachVideo(Branch $branch, Video $video)
    {
        $branch->videos()->detach($video->id);
        return response()->noContent(); // 204
    }

    public function show(Branch $branch)
    {
        $branch->load([
            'videos' => function ($q) {
                $q->select('videos.id','videos.title','videos.path','videos.file_path','videos.url')
                  ->orderBy('branch_video.position','asc');
            }
        ]);

        $queue = $branch->videos->map(function ($v) {
            return [
                'id'    => $v->id,
                'title' => $v->title,
                'url'   => $v->url ?? null,
                'path'  => $v->path ?? $v->file_path ?? null,
            ];
        })->values();

        return response()->json([
            'data' => [
                'id'    => $branch->id,
                'name'  => $branch->name,
                'code'  => $branch->code,
                'queue' => $queue,
            ]
        ]);
    }

    /**
     * PUT /api/branches/{branch}/credentials
     * Body: { "login_user": "usuario", "password": "opcional" }
     */
    public function updateCredentials(Request $request, Branch $branch)
    {
        $data = $request->validate([
            'login_user' => [
                'nullable','string','max:60',
                Rule::unique('branches','login_user')->ignore($branch->id),
            ],
            'password'   => ['nullable','string','min:6'],
        ]);

        if (array_key_exists('login_user', $data)) {
            $branch->login_user = $data['login_user']; // puede ser null para quitar usuario
        }

        if (!empty($data['password'])) {
            $branch->login_password = bcrypt($data['password']);
        }

        $branch->save();

        return response()->json([
            'message' => 'Credenciales actualizadas',
            'data'    => ['login_user' => $branch->login_user],
        ]);
    }
}
