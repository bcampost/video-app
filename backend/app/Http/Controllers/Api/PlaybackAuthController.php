<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PlaybackAuthController extends Controller
{
    public function login(Request $request)
    {
        $payload = $request->validate([
            'code'     => ['required','string','max:50'],
            'password' => ['required','string','max:255'],
        ]);

        // Búsqueda case-insensitive
        $code = strtolower(trim($payload['code']));
        $branch = Branch::whereRaw('LOWER(code) = ?', [$code])->first();

        if (!$branch || empty($branch->playback_password) ||
            !Hash::check($payload['password'], $branch->playback_password)) {
            return response()->json(['message' => 'Credenciales inválidas'], 401);
        }

        // token "simple" para front; si quieres Sanctum/JWT puedes cambiarlo
        $token = hash_hmac('sha256', Str::random(32), config('app.key'));

        return response()->json([
            'ok' => true,
            'token' => $token,
            'branch' => [
                'id'   => $branch->id,
                'code' => $branch->code,
                'name' => $branch->name,
            ],
        ]);
    }
}
