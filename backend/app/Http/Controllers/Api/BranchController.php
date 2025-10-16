<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Video;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class BranchController extends Controller
{
    /**
     * Listado de sucursales con videos_count para el panel.
     */
    public function index()
    {
        $branches = Branch::query()
            ->withCount('videos')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $branches]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:150'],
            'code'        => ['required', 'string', 'max:50', 'unique:branches,code'],
            'login_user'  => ['nullable', 'string', 'max:100', 'unique:branches,login_user'],
            'password'    => ['nullable', 'string', 'min:6'],
        ]);

        $branch = new Branch([
            'name'       => $data['name'],
            'code'       => $data['code'],
            'login_user' => $data['login_user'] ?? null,
        ]);

        if (!empty($data['password'])) {
            $branch->login_password = Hash::make($data['password']);
        }

        $branch->save();

        return response()->json(['data' => $branch], 201);
    }

    public function update(Request $request, Branch $branch)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('branches', 'code')->ignore($branch->id)],
        ]);

        $branch->fill($data)->save();

        return response()->json(['data' => $branch]);
    }

    public function destroy(Branch $branch)
    {
        $branch->videos()->detach();
        $branch->delete();

        return response()->json(['message' => 'Branch deleted']);
    }

    /**
     * 👇 Devuelve la cola ORDENADA de la sucursal (para la grilla tipo Excel).
     * Shape estable: { data: [ {id, title}, ... ] }
     */
    public function show(Branch $branch)
    {
        $queue = $branch->videos()
            ->select('videos.id', 'videos.title')
            ->get();

        return response()->json(['data' => $queue]);
    }

    /**
     * Actualiza solo las credenciales de la sucursal.
     * body: { login_user?, password? }
     */
    public function updateCredentials(Request $request, Branch $branch)
    {
        $data = $request->validate([
            'login_user' => ['nullable', 'string', 'max:100', Rule::unique('branches', 'login_user')->ignore($branch->id)],
            'password'   => ['nullable', 'string', 'min:6'],
        ]);

        if (array_key_exists('login_user', $data)) {
            $branch->login_user = $data['login_user'] ?: null;
        }

        if (!empty($data['password'])) {
            $branch->login_password = Hash::make($data['password']);
        }

        $branch->save();

        return response()->json(['data' => $branch]);
    }

    /**
     * Sincroniza la cola completa de una sucursal.
     * body: { video_ids: [1,2,3,...] }  → respeta el orden recibido como position
     */
    public function syncVideos(Request $request, Branch $branch)
    {
        $videoIds = collect($request->input('video_ids', []))
            ->filter(fn ($v) => is_numeric($v))
            ->map(fn ($v) => (int) $v)
            ->values();

        // Validar existencia
        $exists = Video::query()->whereIn('id', $videoIds)->pluck('id')->all();
        $existsSet = collect($exists)->flip(); // map id => idx

        // Construir array [video_id => ['position' => n]]
        $sync = [];
        foreach ($videoIds as $pos => $vid) {
            if ($existsSet->has($vid)) {
                $sync[$vid] = ['position' => $pos + 1];
            }
        }

        $branch->videos()->sync($sync);

        // Devuelve la cola ordenada resultante
        $queue = $branch->videos()->select('videos.id', 'videos.title')->get();

        return response()->json(['data' => $queue]);
    }

    /**
     * Limpia toda la cola de una sucursal.
     */
    public function clearVideos(Branch $branch)
    {
        $branch->videos()->detach();

        return response()->json(['data' => []]);
    }

    /**
     * Quita un video específico de la cola.
     */
    public function detachVideo(Branch $branch, Video $video)
    {
        $branch->videos()->detach($video->id);

        $queue = $branch->videos()->select('videos.id', 'videos.title')->get();

        return response()->json(['data' => $queue]);
    }
}
