<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    // uso: ->middleware('role:admin,superadmin')
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return $next($request);
        }
        if (in_array($user->role, $roles, true)) {
            return $next($request);
        }
        return response()->json(['message' => 'Forbidden'], 403);
    }
}
