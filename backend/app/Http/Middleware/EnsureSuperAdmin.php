<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureSuperAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'superadmin') {
            return response()->json(['message' => 'No autorizado'], 403);
        }
        return $next($request);
    }
}
