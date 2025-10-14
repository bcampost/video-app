<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BranchAuthController extends Controller
{
    /**
     * POST /api/branch/login
     * Body: { user?: string, code?: string, password: string }
     *
     * Acepta user o code (compat), compara user y code sin distinguir mayúsculas
     * y verifica la contraseña hasheada en login_password.
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'user'     => 'required_without:code|string',
            'code'     => 'required_without:user|string',
            'password' => 'required|string',
        ]);

        $login = $data['user'] ?? $data['code'];
        $loginLower = mb_strtolower(trim($login));

        // 1) Buscar por login_user (case-insensitive)
        $branch = Branch::whereRaw('LOWER(login_user) = ?', [$loginLower])->first();

        // 2) Fallback: si no hay login_user, permitir login por code (case-insensitive)
        if (!$branch) {
            $branch = Branch::whereRaw('LOWER(code) = ?', [$loginLower])->first();
        }

        if (!$branch || empty($branch->login_password) || !Hash::check($data['password'], $branch->login_password)) {
            // 422 para que el frontend muestre el mensaje sin saltar auth global
            return response()->json(['message' => 'Credenciales inválidas'], 422);
        }

        // Token opaco (si no usas Sanctum aquí)
        $token = Str::uuid()->toString();

        return response()->json([
            'token'  => $token,
            'branch' => [
                'id'   => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
                'user' => $branch->login_user,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        return response()->json(['ok' => true]);
    }
}
