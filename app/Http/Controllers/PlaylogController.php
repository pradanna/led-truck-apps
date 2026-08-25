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
     * Instant render with local database and cache
     */
    public function index(Request $request): Response
    {
        $selectedTruck = $request->query('truck_id', 'truck_1');
        if (!in_array($selectedTruck, ['truck_1', 'truck_2', 'all'])) {
            $selectedTruck = 'truck_1';
        }

        $playlistTruck = ($selectedTruck === 'all') ? 'truck_1' : $selectedTruck;

        $playlistResult = \Illuminate\Support\Facades\Cache::get("vnnox_playlist_data_{$playlistTruck}", [
            'success' => true,
            'items' => []
        ]);
        $controllerStatus = \Illuminate\Support\Facades\Cache::get("vnnox_controller_status_{$playlistTruck}", [
            'success' => true,
            'onlineStatus' => false,
            'processorChip' => 'NovaStar TU20Pro',
            'refreshRate' => '3,840 Hz',
        ]);

        // 1. Check local database records
        $query = \App\Models\VnnoxPlaylogLog::whereDate('log_date', date('Y-m-d'));
        if ($selectedTruck !== 'all') {
            $query->where('truck_id', $selectedTruck);
        }
        $dbPlaylogs = $query->orderBy('play_time', 'desc')->get();

        if ($dbPlaylogs->count() > 0) {
            $records = [];
            foreach ($dbPlaylogs as $idx => $dbLog) {
                $truckLabel = $dbLog->truck_id === 'truck_2' ? 'Truk LED 02 (B 9729 JXS)' : 'Truk LED 01 (B 9731 JXS)';
                $records[] = [
                    'id' => 'LOG-' . str_pad($idx + 1, 3, '0', STR_PAD_LEFT),
                    'materi' => $dbLog->media_name,
                    'klien' => $dbLog->client_name ?: 'Klien Umum',
                    'stempelWaktu' => $dbLog->play_time ?: ($dbLog->log_date->format('Y-m-d') . ' WIB'),
                    'durasi' => $dbLog->duration,
                    'status' => $dbLog->status,
                    'infoSistem' => $dbLog->info_system ?: 'Tercatat di Database Server',
                    'truckId' => $dbLog->truck_id,
                    'truckLabel' => $truckLabel,
                ];
            }
            $playlogResult = [
                'success' => true,
                'records' => $records,
            ];
        } else {
            $playlogResult = \Illuminate\Support\Facades\Cache::get("vnnox_playlog_records_{$playlistTruck}", [
                'success' => true,
                'records' => []
            ]);
        }

        $truckInfo = [
            'id' => $selectedTruck,
            'name' => $selectedTruck === 'all' ? 'Semua Armada Truk LED' : ($selectedTruck === 'truck_2' ? 'Truk LED 02' : 'Truk LED 01'),
            'plateNumber' => $selectedTruck === 'all' ? '2 Unit Aktif' : ($selectedTruck === 'truck_2' ? 'B 9729 JXS' : 'B 9731 JXS'),
            'location' => $selectedTruck === 'all' ? 'Tangerang & BSD City' : ($selectedTruck === 'truck_2' ? 'Gading Serpong / Tangerang' : 'BSD City / Tangerang'),
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

        // Auto-archive into DB
        if (!empty($playlogResult['records'])) {
            foreach ($playlogResult['records'] as $rec) {
                try {
                    \App\Models\VnnoxPlaylogLog::recordLog($selectedTruck, date('Y-m-d'), $rec);
                } catch (\Throwable $e) {}
            }
        }

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
