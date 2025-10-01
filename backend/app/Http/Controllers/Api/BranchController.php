<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Branch;

class BranchController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'code' => 'required|string|unique:branches,code',
        ]);

        $branch = Branch::create([
            'name' => $request->name,
            'code' => $request->code,
        ]);

        return response()->json([
            'message' => 'Sucursal creada',
            'branch' => $branch,
        ], 201);
    }

    public function index()
    {
        return Branch::select('id', 'name', 'code')->get();
    }

}
