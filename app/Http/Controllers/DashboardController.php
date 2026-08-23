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
     * API endpoint to asynchronously fetch only GPS telemetry
     */
    public function getGpsData(Request $request)
    {
        $devices = $this->foxlogger->getDeviceList();
        $positions = $this->foxlogger->getReportPosition();

        return response()->json([
            'success' => true,
            'gpsDevices' => $devices,
            'gpsPositions' => $positions,
        ]);
    }

    /**
     * API endpoint to asynchronously fetch only Novastar / VNNOX videotron & playlog
     */
    public function getNovastarData(Request $request)
    {
        $truckId = $request->query('truck_id', 'truck_1');
        $playlistResult = $this->vnnox->getPlaylistData(false, $truckId);
        $controllerStatus = $this->vnnox->getNovastarControllerStatus(false, $truckId);
        $playlogResult = $this->vnnox->getPlaylogRecordsData(false, $truckId);

        return response()->json([
            'success' => true,
            'playlist' => $playlistResult,
            'controller' => $controllerStatus,
            'playlogs' => $playlogResult,
        ]);
    }

    /**
     * API endpoint to asynchronously fetch only CCTV & AI Traffic data
     */
    public function getTrafficData(Request $request)
    {
        $force = $request->boolean('force', false);
        $cctvData = $this->holowits->getLiveMonitoringData($force);

        return response()->json([
            'success' => true,
            'cctvData' => $cctvData,
        ]);
    }
}
