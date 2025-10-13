<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Routing\Router;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(Router $router): void
    {
        // registra los alias de middleware de forma global
        $router->aliasMiddleware('role', \App\Http\Middleware\RoleMiddleware::class);

        // si usas este middleware en algún lado, déjalo registrado también:
        if (class_exists(\App\Http\Middleware\EnsureSuperAdmin::class)) {
            $router->aliasMiddleware('superadmin', \App\Http\Middleware\EnsureSuperAdmin::class);
        }
    }
}
