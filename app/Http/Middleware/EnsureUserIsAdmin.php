<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    /**
     * Handle an incoming request.
     * Only users with 'admin' role can proceed.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->isAdmin()) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak. Fitur ini hanya dapat diakses oleh Administrator.'
                ], 403);
            }

            return redirect('/dashboard')->with('error', 'Akses ditolak. Anda tidak memiliki izin Administrator.');
        }

        return $next($request);
    }
}
