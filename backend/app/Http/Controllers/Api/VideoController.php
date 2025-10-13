<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Video;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VideoController extends Controller
{
    public function index()
    {
        $videos = Video::with(['branches:id,name,code'])->get();

        return response()->json([
            'data' => $videos->map(function ($v) {
                return [
                    'id'       => $v->id,
                    'title'    => $v->title,
                    'url'      => $v->url ? Storage::disk('public')->url($v->url) : null,
                    'branches' => $v->branches->map(fn($b) => [
                        'id'=>$b->id,'name'=>$b->name,'code'=>$b->code
                    ])->values(),
                ];
            })->values(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required','string','max:255'],
            'video' => ['required','file','mimetypes:video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska'],
        ]);

        $path = $request->file('video')->store('videos', 'public');

        $video = Video::create([
            'title' => $data['title'],
            'url'   => $path, // guardamos path relativo
        ]);

        return response()->json([
            'message' => 'Video subido',
            'data'    => [
                'id' => $video->id,
                'title' => $video->title,
                'url' => Storage::disk('public')->url($video->url),
                'branches' => [],
            ],
        ], 201);
    }

    public function update(Request $request, Video $video)
    {
        $payload = $request->validate(['title' => ['required','string','max:255']]);
        $video->update(['title' => $payload['title']]);

        return response()->json([
            'message' => 'Actualizado',
            'data' => [
                'id'    => $video->id,
                'title' => $video->title,
                'url'   => $video->url ? Storage::disk('public')->url($video->url) : null,
            ],
        ]);
    }

    public function destroy(Video $video)
    {
        if ($video->url && Storage::disk('public')->exists($video->url)) {
            Storage::disk('public')->delete($video->url);
        }
        $video->branches()->detach();
        $video->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}
