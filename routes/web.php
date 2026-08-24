<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GpsTrackingController;
use App\Http\Controllers\PlaylogController;
use App\Http\Controllers\CctvMonitoringController;
use App\Http\Controllers\CampaignDocumentationController;
use App\Http\Controllers\SettingsController;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web & Authentication Routes
|--------------------------------------------------------------------------
*/

// Guest Login Routes
Route::middleware('guest')->group(function () {
    Route::get('/', [AuthenticatedSessionController::class, 'create'])->name('home');
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);
});

// Logout Route
Route::match(['get', 'post'], '/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

// Authenticated Routes (Accessible by both Admin and Client/User)
Route::middleware('auth')->group(function () {
    // 1. Dashboard Overview
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/api/dashboard/gps', [DashboardController::class, 'getGpsData']);
    Route::get('/api/dashboard/novastar', [DashboardController::class, 'getNovastarData']);
    Route::get('/api/dashboard/traffic', [DashboardController::class, 'getTrafficData']);

    // 2. GPS Tracking (Viewable by All)
    Route::get('/gps-tracking', [GpsTrackingController::class, 'index'])->name('gps.tracking');
    Route::get('/api/gps-history/{imei}', [GpsTrackingController::class, 'getGpsHistory']);
    Route::get('/api/export-gps-excel', [GpsTrackingController::class, 'exportExcel']);
    Route::get('/api/export-gps-pdf', [GpsTrackingController::class, 'exportPdf']);

    // 3. Live CCTV Monitoring (Viewable by All)
    Route::get('/cctv-monitoring', [CctvMonitoringController::class, 'index'])->name('cctv.monitoring');
    Route::get('/api/cctv/stream-data', [CctvMonitoringController::class, 'getStreamData']);
    Route::get('/api/cctv/truck/{truckId}', [CctvMonitoringController::class, 'getTruckStreamData']);
    Route::post('/api/cctv/snapshot', [CctvMonitoringController::class, 'takeSnapshot']);
    Route::post('/api/cctv/ptz', [CctvMonitoringController::class, 'handlePtz']);
    Route::match(['get', 'post'], '/api/cctv/webrtc', [CctvMonitoringController::class, 'webrtc']);

    // 4. Playlog & Novastar (Viewable by All)
    Route::get('/playlog', [PlaylogController::class, 'index'])->name('playlog');
    Route::get('/api/vnnox/live-data', [PlaylogController::class, 'getLiveData']);
    Route::get('/api/vnnox/export-logs', [PlaylogController::class, 'exportCsv']);

    // 5. Dokumentasi Kampanye (Viewable by All, filtered by Client)
    Route::get('/campaign-documentation', [CampaignDocumentationController::class, 'index'])->name('campaign.documentation');

    // 6. Laporan Detail Komprehensif (Multi-Tab: Overview, Traffic AI, Playlog, GPS)
    Route::get('/laporan-detail', [\App\Http\Controllers\ReportController::class, 'index'])->name('reports.detail');
    Route::get('/api/report/export-pdf', [\App\Http\Controllers\ReportController::class, 'exportPdf']);
    Route::get('/api/report/export-excel', [\App\Http\Controllers\ReportController::class, 'exportExcel']);

    // =========================================================================
    // ADMIN ONLY ROUTES (EnsureUserIsAdmin middleware)
    // Ganti Materi Iklan, Pengaturan NVR, Upload Dokumentasi & Manajemen Akun
    // =========================================================================
    Route::middleware(\App\Http\Middleware\EnsureUserIsAdmin::class)->group(function () {
        // Admin: Trigger ganti materi & tambah materi playlist
        Route::post('/api/vnnox/play', [PlaylogController::class, 'triggerPlay']);
        Route::post('/api/vnnox/materials', [PlaylogController::class, 'storeMaterial']);

        // Admin: Dokumentasi Kampanye Upload & Delete
        Route::post('/api/campaigns', [CampaignDocumentationController::class, 'store']);
        Route::delete('/api/campaigns/{id}', [CampaignDocumentationController::class, 'destroy']);

        // Admin: CCTV & NVR Settings
        Route::post('/api/cctv/settings', [CctvMonitoringController::class, 'updateSettings']);

        // Admin: GPS Token Refresh
        Route::post('/api/foxlogger/refresh-token', [GpsTrackingController::class, 'refreshToken']);

        // Admin: Global Settings & User Account Expiration Management
        Route::get('/settings', [SettingsController::class, 'index'])->name('settings');
        Route::post('/api/settings/nvr', [SettingsController::class, 'updateNvr']);
        Route::post('/api/settings/foxlogger', [SettingsController::class, 'updateFoxlogger']);
        Route::post('/api/settings/vnnox', [SettingsController::class, 'updateVnnox']);
        Route::post('/api/settings/users', [SettingsController::class, 'storeUser']);
        Route::put('/api/settings/users/{id}', [SettingsController::class, 'updateUser']);
        Route::delete('/api/settings/users/{id}', [SettingsController::class, 'deleteUser']);
    });
});
