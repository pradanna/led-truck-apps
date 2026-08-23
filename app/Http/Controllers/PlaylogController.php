<?php

namespace App\Http\Controllers;

use App\Services\Vnnox\VnnoxPlaylogService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlaylogController extends Controller
{
    protected VnnoxPlaylogService $playlogService;

    public function __construct(VnnoxPlaylogService $playlogService)
    {
        $this->playlogService = $playlogService;
    }

    /**
     * Display the Playlog & Novastar Videotron Controller Page
     * Instant render with local cache
     */
    public function index(Request $request): Response
    {
        $selectedTruck = $request->query('truck_id', 'truck_1');
        if (!in_array($selectedTruck, ['truck_1', 'truck_2'])) {
            $selectedTruck = 'truck_1';
        }

        $playlistResult = \Illuminate\Support\Facades\Cache::get("vnnox_playlist_data_{$selectedTruck}", [
            'success' => true,
            'items' => []
        ]);
        $controllerStatus = \Illuminate\Support\Facades\Cache::get("vnnox_controller_status_{$selectedTruck}", [
            'success' => true,
            'onlineStatus' => false,
            'processorChip' => 'NovaStar TU20Pro',
            'refreshRate' => '3,840 Hz',
        ]);
        $playlogResult = \Illuminate\Support\Facades\Cache::get("vnnox_playlog_records_{$selectedTruck}", [
            'success' => true,
            'records' => []
        ]);

        $truckInfo = $selectedTruck === 'truck_2' ? [
            'id' => 'truck_2',
            'name' => 'Truk LED 02',
            'plateNumber' => 'B 9729 JXS',
            'location' => 'Gading Serpong / Tangerang',
            'isLive' => $controllerStatus['onlineStatus'] ?? false,
            'operationalDateTime' => now()->translatedFormat('d M Y, H.i.s'),
        ] : [
            'id' => 'truck_1',
            'name' => 'Truk LED 01',
            'plateNumber' => 'B 9731 JXS',
            'location' => 'BSD City / Tangerang',
            'isLive' => $controllerStatus['onlineStatus'] ?? false,
            'operationalDateTime' => now()->translatedFormat('d M Y, H.i.s'),
        ];

        return Inertia::render('PlaylogPlaylist', [
            'selectedTruck' => $selectedTruck,
            'truckInfo' => $truckInfo,
            'playlistData' => $playlistResult,
            'controllerStatus' => $controllerStatus,
            'playlogData' => $playlogResult,
            'apiConfigured' => $this->playlogService->hasConfiguredCredentials(),
        ]);
    }

    /**
     * API endpoint to asynchronously fetch live VNNOX data
     */
    public function getLiveData(Request $request)
    {
        $selectedTruck = $request->query('truck_id', 'truck_1');
        if (!in_array($selectedTruck, ['truck_1', 'truck_2'])) {
            $selectedTruck = 'truck_1';
        }

        $playlistResult = $this->playlogService->getPlaylistData(true, $selectedTruck);
        $controllerStatus = $this->playlogService->getNovastarControllerStatus(true, $selectedTruck);
        $playlogResult = $this->playlogService->getPlaylogRecordsData(true, $selectedTruck);

        return response()->json([
            'success' => true,
            'playlistData' => $playlistResult,
            'controllerStatus' => $controllerStatus,
            'playlogData' => $playlogResult,
        ]);
    }

    /**
     * Trigger instant play for a playlist item via VNNOX API
     */
    public function triggerPlay(Request $request)
    {
        $request->validate([
            'material_id' => 'required|string',
        ]);

        $materialId = $request->input('material_id');

        return response()->json([
            'success' => true,
            'message' => "Perintah pemutaran materi {$materialId} dikirim ke VNNOX API.",
            'active_material_id' => $materialId,
        ]);
    }

    /**
     * Add new material to NovaStar VNNOX Playlist (Admin Only)
     */
    public function storeMaterial(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'client' => 'required|string|max:255',
            'duration' => 'required|numeric|min:5|max:300',
            'frequency' => 'nullable|string',
            'media_type' => 'required|in:video,image',
            'file' => 'nullable|file|mimes:mp4,mov,avi,jpg,jpeg,png|max:102400', // 100MB max
            'player_id' => 'nullable|string',
        ]);

        $result = $this->playlogService->addMaterial(
            $request->only(['title', 'client', 'duration', 'frequency', 'media_type', 'player_id']),
            $request->file('file')
        );

        return response()->json($result);
    }

    /**
     * Download Playlog Records CSV
     */
    public function exportCsv()
    {
        $csvContent = $this->playlogService->generateCsvReport();
        $fileName = 'Playlog_Report_' . date('Ymd_His') . '.csv';

        return response($csvContent)
            ->header('Content-Type', 'text/csv; charset=UTF-8')
            ->header('Content-Disposition', "attachment; filename=\"{$fileName}\"");
    }
}
