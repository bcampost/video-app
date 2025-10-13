<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BranchVideo;
use App\Models\Video;
use Illuminate\Http\Request;

class BranchVideoController extends Controller
{
    public function getVideos($code)
    {
        $branch = Branch::where('code', $code)->firstOrFail();

        $videos = Video::whereHas('branches', function ($q) use ($branch) {
            $q->where('branches.id', $branch->id);
        })->get();

        return response()->json($videos);
    }

    public function assignVideos(Request $request, $branch_id)
    {
        $branch = Branch::findOrFail($branch_id);
        $videoIds = $request->input('video_ids', []);

        $branch->videos()->sync($videoIds);

        return response()->json(['message' => 'Videos assigned successfully']);
    }
}
