<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Branch;

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

        // Reemplaza el set completo de relaciones
        $branch->videos()->sync($data['video_ids']);

        return response()->json([
            'ok'     => true,
            'branch' => ['id'=>$branch->id,'code'=>$branch->code,'name'=>$branch->name],
            'count'  => count($data['video_ids']),
        ]);
    }
}
