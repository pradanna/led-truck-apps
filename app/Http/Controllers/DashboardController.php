<?php

namespace App\Http\Controllers;

use App\Services\FoxloggerService;
use App\Services\Vnnox\VnnoxPlaylogService;
use App\Services\HolowitsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    protected FoxloggerService $foxlogger;
    protected VnnoxPlaylogService $vnnox;
    protected HolowitsService $holowits;

    public function __construct(
        FoxloggerService $foxlogger,
        VnnoxPlaylogService $vnnox,
        HolowitsService $holowits
    ) {
        $this->foxlogger = $foxlogger;
        $this->vnnox = $vnnox;
        $this->holowits = $holowits;
    }

    /**
     * Display the Executive Overview Dashboard
     * Instant 0ms render with cached local state
     */
    public function index(Request $request): Response
    {
        // Return instantly using memory/database cache
        $devices = \Illuminate\Support\Facades\Cache::get('foxlogger_devices_list_combined', []);
        $positions = \Illuminate\Support\Facades\Cache::get('foxlogger_positions_report_combined', []);
        $playlistResult = \Illuminate\Support\Facades\Cache::get('vnnox_playlist_data_truck_1', ['items' => []]);
        $controllerStatus = \Illuminate\Support\Facades\Cache::get('vnnox_controller_status_truck_1', ['onlineStatus' => false]);
        $playlogResult = \Illuminate\Support\Facades\Cache::get('vnnox_playlog_records_truck_1', ['records' => []]);
        $cctvData = \Illuminate\Support\Facades\Cache::get('holowits_truck_statuses', []);

        return Inertia::render('Dashboard', [
            'gpsDevices' => $devices,
            'gpsPositions' => $positions,
            'novastarData' => [
                'playlist' => $playlistResult,
                'controller' => $controllerStatus,
                'playlogs' => $playlogResult,
            ],
            'cctvData' => $cctvData,
        ]);
    }

    /**
     * API endpoint to asynchronously fetch live telemetry for all components
     */
    public function getLiveData(Request $request)
    {
        $devices = $this->foxlogger->getDeviceList();
        $positions = $this->foxlogger->getReportPosition();
        $playlistResult = $this->vnnox->getPlaylistData();
        $controllerStatus = $this->vnnox->getNovastarControllerStatus();
        $playlogResult = $this->vnnox->getPlaylogRecordsData();
        $cctvData = $this->holowits->getLiveMonitoringData();

        return response()->json([
            'success' => true,
            'gpsDevices' => $devices,
            'gpsPositions' => $positions,
            'novastarData' => [
                'playlist' => $playlistResult,
                'controller' => $controllerStatus,
                'playlogs' => $playlogResult,
            ],
            'cctvData' => $cctvData,
        ]);
    }
}
