<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BranchToken
{
    public function handle(Request $request, Closure $next)
    {
        $token = $this->extractToken($request);
        if (!$token) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $branchId = Cache::get('branch_token:' . $token);
        if (!$branchId) {
            return response()->json(['message' => 'Token inválido'], 401);
        }

        // Lo dejamos disponible por si quieres cruzarlo con {code}
        $request->attributes->set('branch_id', $branchId);
        return $next($request);
    }

    private function extractToken(Request $request): ?string
    {
        $hdr = $request->header('Authorization', '');
        if (preg_match('/Bearer\s+(.+)/i', $hdr, $m)) {
            return trim($m[1]);
        }
        return $request->header('X-Branch-Token');
    }
}
