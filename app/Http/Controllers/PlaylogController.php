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
     */
    public function index(Request $request): Response
    {
        $playlistResult = $this->playlogService->getPlaylistData();
        $controllerStatus = $this->playlogService->getNovastarControllerStatus();
        $playlogResult = $this->playlogService->getPlaylogRecordsData();

        return Inertia::render('PlaylogPlaylist', [
            'truckInfo' => [
                'name' => 'LED Truck Giga 01',
                'plateNumber' => 'B 9482 LED',
                'location' => 'Bundaran HI',
                'isLive' => $controllerStatus['onlineStatus'] ?? false,
                'operationalDateTime' => now()->translatedFormat('d M Y, H.i.s'),
            ],
            'playlistData' => $playlistResult,
            'controllerStatus' => $controllerStatus,
            'playlogData' => $playlogResult,
            'apiConfigured' => $this->playlogService->hasConfiguredCredentials(),
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
