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
    protected HolowitsService $holowits;
    protected FoxloggerService $foxlogger;
    protected VnnoxPlaylogService $vnnox;

    public function __construct(
        HolowitsService $holowits,
        FoxloggerService $foxlogger,
        VnnoxPlaylogService $vnnox
    ) {
        $this->holowits = $holowits;
        $this->foxlogger = $foxlogger;
        $this->vnnox = $vnnox;
    }

    /**
     * Display the Global Settings Page
     */
    public function index(Request $request): Response
    {
        $truckConfigs = $this->holowits->getTruckConfigs();
        $foxloggerSession = $this->foxlogger->getValidSession();
        $hasVnnox = $this->vnnox->hasConfiguredCredentials();

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
                    'is_expired' => $u->isExpired(),
                ];
            });

        // Load global integration settings (masked for safety)
        $foxloggerUsername = SystemSetting::get('foxlogger_username', env('EMAIL_LOGFLOGGER', 'centralledid168@gmail.com'));
        $foxloggerPassword = SystemSetting::get('foxlogger_password', env('PASSWORD_LOGFLOGGER', '575859'));

        $vnnoxBaseUrl = SystemSetting::get('vnnox_base_url', config('services.vnnox.base_url', env('VNNOX_BASE_URL', 'https://openapi-eu.vnnox.com')));
        $vnnoxAppKey = SystemSetting::get('vnnox_app_key', config('services.vnnox.app_key', env('VNNOX_APP_KEY', '')));
        $vnnoxAppSecret = SystemSetting::get('vnnox_app_secret', config('services.vnnox.app_secret', env('VNNOX_APP_SECRET', '')));

        return Inertia::render('Settings', [
            'truckConfigs' => $truckConfigs,
            'globalIntegrations' => [
                'foxlogger' => [
                    'username' => $foxloggerUsername,
                    'password' => $foxloggerPassword,
                ],
                'vnnox' => [
                    'base_url' => $vnnoxBaseUrl,
                    'app_key' => $vnnoxAppKey,
                    'app_secret' => $vnnoxAppSecret,
                ]
            ],
            'apiStatus' => [
                'foxlogger' => !empty($foxloggerSession['access_token']),
                'vnnox' => $hasVnnox,
            ],
            'usersList' => $users,
        ]);
    }

    /**
     * Update Foxlogger GPS Credentials (Encrypted)
     */
    public function updateFoxlogger(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        \App\Models\SystemSetting::set('foxlogger_username', trim($request->input('username')), 'foxlogger', false, 'Email/Username Akun Foxlogger');
        \App\Models\SystemSetting::set('foxlogger_password', trim($request->input('password')), 'foxlogger', true, 'Password Akun Foxlogger');

        // Test login directly
        $session = $this->foxlogger->login();

        return response()->json([
            'success' => true,
            'message' => 'Kredensial Foxlogger berhasil disimpan dan dienkripsi di database!',
            'session_active' => !empty($session['access_token']),
        ]);
    }

    /**
     * Update VNNOX Player API Credentials (Encrypted)
     */
    public function updateVnnox(Request $request)
    {
        $request->validate([
            'base_url' => 'required|string|url',
            'app_key' => 'required|string',
            'app_secret' => 'required|string',
        ]);

        \App\Models\SystemSetting::set('vnnox_base_url', rtrim(trim($request->input('base_url')), '/'), 'vnnox', false, 'Base URL API VnNox');
        \App\Models\SystemSetting::set('vnnox_app_key', trim($request->input('app_key')), 'vnnox', true, 'App Key API VnNox');
        \App\Models\SystemSetting::set('vnnox_app_secret', trim($request->input('app_secret')), 'vnnox', true, 'App Secret API VnNox');

        return response()->json([
            'success' => true,
            'message' => 'Kredensial API VnNox berhasil disimpan dan dienkripsi di database!',
        ]);
    }

    /**
     * Update Truck NVR Network Configurations (Admin Only)
     */
    public function updateNvr(Request $request)
    {
        $request->validate([
            'truck_id' => 'required|string',
            'nvr_ip' => 'required|string',
            'http_port' => 'nullable|numeric',
            'rtsp_port' => 'nullable|numeric',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
        ]);

        $configs = $this->holowits->getTruckConfigs();
        $truckId = $request->input('truck_id');

        if (!isset($configs[$truckId])) {
            return response()->json([
                'success' => false,
                'message' => 'ID Truk tidak valid.'
            ], 404);
        }

        $configs[$truckId]['nvr_ip'] = trim($request->input('nvr_ip'));
        if ($request->filled('http_port')) $configs[$truckId]['http_port'] = (int)$request->input('http_port');
        if ($request->filled('rtsp_port')) $configs[$truckId]['rtsp_port'] = (int)$request->input('rtsp_port');
        if ($request->filled('username')) $configs[$truckId]['username'] = trim($request->input('username'));
        if ($request->filled('password')) $configs[$truckId]['password'] = $request->input('password');

        $this->holowits->saveTruckConfigs($configs);

        // Force test connection to NVR
        $freshData = $this->holowits->getLiveMonitoringData(true);

        return response()->json([
            'success' => true,
            'message' => "Pengaturan IP NVR {$configs[$truckId]['name']} berhasil disimpan!",
            'configs' => $configs,
            'monitoring' => $freshData
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
        ]);

        $user = User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'password' => Hash::make($request->input('password')),
            'role' => $request->input('role'),
            'expires_at' => $request->input('role') === 'admin' ? null : $request->input('expires_at'),
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Akun {$user->name} ({$user->role}) berhasil dibuat!",
            'user' => $user,
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

        return response()->json([
            'success' => true,
            'message' => "Akun {$user->name} berhasil diperbarui!",
            'user' => $user,
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
