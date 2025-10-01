<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Video;
use App\Models\Branch;
use Illuminate\Support\Facades\Storage;

class VideoController extends Controller
{
    /**
     * Listar todos los videos (con sucursales asociadas)
     */
    public function index()
    {
        $videos = Video::with('branches:id,name,code')->get();
        return response()->json($videos);
    }

    /**
     * Subir y asociar un nuevo video a una sucursal
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'video' => 'required|file|mimes:mp4,avi,mov|max:204800', // 200MB
            'branch_code' => 'required|string|exists:branches,code',
        ]);

        $path = $request->file('video')->store('videos', 'public');

        $video = Video::create([
            'title' => $request->input('title'),
            'filename' => $path,
        ]);

        $branch = Branch::where('code', $request->input('branch_code'))->first();
        $video->branches()->attach($branch->id);

        return response()->json([
            'message' => 'Video subido y vinculado con éxito 🎉',
            'video' => $video,
            'branch' => $branch
        ]);
    }

    /**
     * Actualizar el título de un video
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'title' => 'required|string|max:255'
        ]);

        $video = Video::findOrFail($id);
        $video->title = $request->title;
        $video->save();

        return response()->json([
            'message' => 'Título actualizado',
            'video' => $video
        ]);
    }

    /**
     * Eliminar un video y su archivo asociado
     */
    public function destroy($id)
    {
        $video = Video::findOrFail($id);

        // Eliminar archivo del disco si existe
        if ($video->filename && Storage::disk('public')->exists($video->filename)) {
            Storage::disk('public')->delete($video->filename);
        }

        // Desvincular de sucursales y eliminar registro
        $video->branches()->detach();
        $video->delete();

        return response()->json(['message' => 'Video eliminado']);
    }
}
