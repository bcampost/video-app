<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'email'      => ['required','email', Rule::unique('users','email')],
            'password'   => ['required','min:6'],
            'role'       => ['required', Rule::in(['user','admin','superadmin'])],
            'master_key' => ['nullable'], // requerida si role es admin/superadmin (validamos abajo)
        ]);

        if (in_array($data['role'], ['admin','superadmin'], true)) {
            if (($data['master_key'] ?? null) !== 'Admin@LineaItalia2025') {
                return response()->json(['message' => 'Clave superadmin inválida'], 422);
            }
        }

        $user = User::create([
            'email'    => $data['email'],
            'password' => $data['password'], // se hashea por mutator en el modelo
            'role'     => $data['role'],
        ]);

        $token = $user->createToken('dashboard')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email'    => ['required','email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Credenciales inválidas'], 422);
        }

        $token = $user->createToken('dashboard')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['ok' => true]);
    }
}
