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
     * Combines Foxlogger GPS, Novastar/VNNOX Videotron, and Holowits Traffic & CCTV
     */
    public function index(Request $request): Response
    {
        // 1. Foxlogger GPS data (positions & devices)
        $devices = $this->foxlogger->getDeviceList();
        $positions = $this->foxlogger->getReportPosition();

        // 2. Novastar / VNNOX Videotron data (playlist, active material, logs, controller status)
        $playlistResult = $this->vnnox->getPlaylistData();
        $controllerStatus = $this->vnnox->getNovastarControllerStatus();
        $playlogResult = $this->vnnox->getPlaylogRecordsData();

        // 3. Holowits CCTV & Traffic Analytics data
        $cctvData = $this->holowits->getLiveMonitoringData();

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
}
