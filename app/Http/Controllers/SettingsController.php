<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\SystemSetting;
use App\Services\HolowitsService;
use App\Services\FoxloggerService;
use App\Services\Vnnox\VnnoxPlaylogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /**
     * Display the Account Settings Page
     */
    public function index(Request $request): Response
    {
        // List all users for Admin User Management
        $users = User::select('id', 'name', 'email', 'role', 'expires_at', 'is_active', 'created_at')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->role,
                    'is_active' => (bool)$u->is_active,
                    'expires_at' => $u->expires_at ? $u->expires_at->format('Y-m-d') : null,
                    'expires_at_human' => $u->expires_at ? $u->expires_at->translatedFormat('d M Y') : 'Tanpa Batas',
                    'created_at_human' => $u->created_at ? $u->created_at->translatedFormat('d M Y') : '-',
                    'is_expired' => $u->isExpired(),
                ];
            });

        return Inertia::render('Settings', [
            'usersList' => $users,
        ]);
    }

    /**
     * Create / Store New User Account with Role and Expiration Date
     */
    public function storeUser(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,user',
            'expires_at' => 'nullable|date',
            'is_active' => 'nullable|boolean',
        ]);

        $user = User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'password' => Hash::make($request->input('password')),
            'role' => $request->input('role'),
            'expires_at' => $request->input('role') === 'admin' ? null : $request->input('expires_at'),
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : true,
        ]);

        $formattedUser = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_active' => (bool)$user->is_active,
            'expires_at' => $user->expires_at ? $user->expires_at->format('Y-m-d') : null,
            'expires_at_human' => $user->expires_at ? $user->expires_at->translatedFormat('d M Y') : 'Tanpa Batas',
            'created_at_human' => $user->created_at ? $user->created_at->translatedFormat('d M Y') : 'Baru saja',
            'is_expired' => $user->isExpired(),
        ];

        return response()->json([
            'success' => true,
            'message' => "Akun {$user->name} berhasil dibuat!",
            'user' => $formattedUser,
        ]);
    }

    /**
     * Update User Account Role, Expiration, or Active Status
     */
    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => "required|string|email|max:255|unique:users,email,{$user->id}",
            'password' => 'nullable|string|min:6',
            'role' => 'required|in:admin,user',
            'expires_at' => 'nullable|date',
            'is_active' => 'required|boolean',
        ]);

        $user->name = $request->input('name');
        $user->email = $request->input('email');
        $user->role = $request->input('role');
        $user->is_active = $request->boolean('is_active');
        $user->expires_at = $request->input('role') === 'admin' ? null : $request->input('expires_at');

        if ($request->filled('password')) {
            $user->password = Hash::make($request->input('password'));
        }

        $user->save();

        $formattedUser = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_active' => (bool)$user->is_active,
            'expires_at' => $user->expires_at ? $user->expires_at->format('Y-m-d') : null,
            'expires_at_human' => $user->expires_at ? $user->expires_at->translatedFormat('d M Y') : 'Tanpa Batas',
            'created_at_human' => $user->created_at ? $user->created_at->translatedFormat('d M Y') : '-',
            'is_expired' => $user->isExpired(),
        ];

        return response()->json([
            'success' => true,
            'message' => "Akun {$user->name} berhasil diperbarui!",
            'user' => $formattedUser,
        ]);
    }

    /**
     * Delete User Account
     */
    public function deleteUser($id)
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.'
            ], 400);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => "Akun {$user->name} berhasil dihapus!"
        ]);
    }
}
