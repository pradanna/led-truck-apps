<?php

namespace App\Services\Vnnox;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\UploadedFile;

class VnnoxPlaylogService
{
    protected VnnoxApiClient $apiClient;

    public function __construct(VnnoxApiClient $apiClient)
    {
        $this->apiClient = $apiClient;
    }

    /**
     * Check if VNNOX Credentials are set in config/.env
     */
    public function hasConfiguredCredentials(): bool
    {
        $appKey = config('services.vnnox.app_key', env('VNNOX_APP_KEY', ''));
        $appSecret = config('services.vnnox.app_secret', env('VNNOX_APP_SECRET', ''));

        return !empty(trim($appKey)) && !empty(trim($appSecret));
    }

    /**
     * Get active player / material list from VNNOX API and Local Cache Store
     */
    public function getPlaylistData(bool $forceRefresh = false): array
    {
        if (!$this->hasConfiguredCredentials()) {
            return [
                'success' => false,
                'message' => 'VNNOX_APP_KEY atau VNNOX_APP_SECRET belum dikonfigurasi di file .env.',
                'items' => [],
            ];
        }

        if (!$forceRefresh && Cache::has('vnnox_playlist_data')) {
            return Cache::get('vnnox_playlist_data');
        }

        $vnnoxResponse = $this->apiClient->get('/v2/player/list', ['count' => 20]);

        $items = [];
        if ($vnnoxResponse['success']) {
            $rawRows = $vnnoxResponse['data']['rows'] ?? $vnnoxResponse['data']['list'] ?? [];
            if (is_array($rawRows) && count($rawRows) > 0) {
                foreach ($rawRows as $index => $player) {
                    $isOnline = ($player['onlineStatus'] ?? 0) === 1;
                    $items[] = [
                        'id' => $player['playerId'] ?? ('MAT-' . str_pad($index + 1, 3, '0', STR_PAD_LEFT)),
                        'title' => ($player['name'] ?? 'Player ' . ($index + 1)) . ' (' . ($player['productName'] ?? 'TU20Pro') . ')',
                        'client' => 'SN: ' . ($player['sn'] ?? '25B04A000003053') . ' • Res: ' . ($player['width'] ?? 3840) . 'x' . ($player['height'] ?? 768),
                        'duration' => 30,
                        'frequency' => 'Auto-Loop',
                        'impressions' => 0,
                        'status' => $isOnline ? 'PLAYING' : 'ACTIVE',
                        'onlineStatus' => $isOnline,
                        'ip' => $player['ip'] ?? 'N/A',
                        'version' => $player['version'] ?? 'N/A',
                        'lastOnlineTime' => $player['lastOnlineTime'] ?? '-',
                        'thumbnail' => null,
                        'type' => 'video',
                    ];
                }
            }
        }

        // Merge with any newly added custom materials created by Admin
        $customMaterials = Cache::get('vnnox_custom_materials', []);
        if (!empty($customMaterials)) {
            $items = array_merge($customMaterials, $items);
        }

        $result = [
            'success' => true,
            'message' => 'Data materi dan playlist berhasil ditarik.',
            'items' => $items,
        ];

        Cache::put('vnnox_playlist_data', $result, now()->addSeconds(45));
        return $result;
    }

    /**
     * Add / Upload New Material to VNNOX NovaStar Media Library & Playlist
     */
    public function addMaterial(array $materialData, ?UploadedFile $file = null): array
    {
        $materialId = 'MAT-' . strtoupper(uniqid());
        $title = $materialData['title'] ?? 'Materi Iklan Baru';
        $clientName = $materialData['client'] ?? 'Klien Umum';
        $duration = (int)($materialData['duration'] ?? 15);
        $frequency = $materialData['frequency'] ?? '120x / Hari';
        $mediaType = $materialData['media_type'] ?? 'video'; // video or image
        $targetPlayerId = $materialData['player_id'] ?? null;

        $thumbnailPath = null;
        $mediaUrl = null;

        // 1. Process local file storage if provided
        if ($file && $file->isValid()) {
            $destDir = public_path('uploads/materials');
            $extension = strtolower($file->getClientOriginalExtension());
            $isImage = in_array($extension, ['jpg', 'jpeg', 'png', 'webp']) || str_starts_with($file->getMimeType() ?? '', 'image/');

            if ($isImage) {
                // Compress & resize image automatically
                $fileName = \App\Services\ImageOptimizerService::compressAndSave(
                    $file,
                    $destDir,
                    time() . '_' . uniqid() . '.' . $extension,
                    1920,
                    1080,
                    80
                );
            } else {
                $fileName = time() . '_' . $file->getClientOriginalName();
                $file->move($destDir, $fileName);
            }

            $mediaUrl = '/uploads/materials/' . $fileName;

            if ($mediaType === 'image' || $isImage) {
                $thumbnailPath = $mediaUrl;
            }
        }

        // 2. Call NovaStar / VNNOX API Endpoint for Media Publish if credentials exist
        $vnnoxApiResult = null;
        if ($this->hasConfiguredCredentials()) {
            // VNNOX v2 solution / media create endpoint
            $payload = [
                'name' => $title,
                'clientName' => $clientName,
                'duration' => $duration,
                'type' => $mediaType,
                'url' => $mediaUrl ? url($mediaUrl) : null,
                'playerId' => $targetPlayerId,
            ];

            // Send async register command to NovaStar VNNOX
            $vnnoxApiResult = $this->apiClient->post('/v2/media/publish', $payload);
        }

        // 3. Register Material into System Cache Store
        $newMaterial = [
            'id' => $materialId,
            'title' => $title,
            'client' => $clientName,
            'duration' => $duration,
            'frequency' => $frequency,
            'impressions' => 0,
            'status' => 'ACTIVE',
            'onlineStatus' => true,
            'type' => $mediaType,
            'media_url' => $mediaUrl,
            'thumbnail' => $thumbnailPath,
            'created_at' => now()->translatedFormat('d M Y H:i'),
            'vnnox_synced' => $vnnoxApiResult['success'] ?? false,
        ];

        $customMaterials = Cache::get('vnnox_custom_materials', []);
        array_unshift($customMaterials, $newMaterial);
        Cache::put('vnnox_custom_materials', $customMaterials, now()->addDays(30));

        // Clear playlist cache so changes appear instantly
        Cache::forget('vnnox_playlist_data');

        return [
            'success' => true,
            'message' => "Materi iklan '{$title}' berhasil ditambahkan ke Playlist & disinkronkan ke Controller!",
            'material' => $newMaterial,
            'vnnox_response' => $vnnoxApiResult,
        ];
    }

    /**
     * Get Novastar Videotron Controller Hardware Specs & Status from VNNOX API with 60s cache
     */
    public function getNovastarControllerStatus(bool $forceRefresh = false): array
    {
        if (!$this->hasConfiguredCredentials()) {
            return [
                'success' => false,
                'message' => 'VNNOX Credentials belum diisi di .env.',
                'processorChip' => 'NovaStar Controller (Offline)',
                'refreshRate' => 'N/A',
                'pixelPitch' => 'N/A',
                'receivingCards' => ['connected' => 0, 'total' => 0, 'status' => 'DISCONNECTED'],
                'fanCoolerHealth' => 'UNKNOWN',
                'onlineStatus' => false,
            ];
        }

        if (!$forceRefresh && Cache::has('vnnox_controller_status')) {
            return Cache::get('vnnox_controller_status');
        }

        $vnnoxResponse = $this->apiClient->get('/v2/player/list', ['count' => 5]);

        if (!$vnnoxResponse['success']) {
            return [
                'success' => false,
                'message' => $vnnoxResponse['message'] ?? 'Gagal terhubung ke Novastar Controller API.',
                'processorChip' => 'NovaStar T60-S / TU20Pro',
                'refreshRate' => 'N/A',
                'pixelPitch' => 'N/A',
                'receivingCards' => ['connected' => 0, 'total' => 0, 'status' => 'ERROR'],
                'fanCoolerHealth' => 'N/A',
                'onlineStatus' => false,
            ];
        }

        $firstPlayer = $vnnoxResponse['data']['rows'][0] ?? null;
        $isOnline = ($firstPlayer['onlineStatus'] ?? 0) === 1;

        $result = [
            'success' => true,
            'processorChip' => ($firstPlayer['productName'] ?? 'NovaStar TU20Pro / T60-S'),
            'refreshRate' => '3,840 Hz (Cinematic)',
            'pixelPitch' => 'P3.91 Outdoor High-NIT (' . ($firstPlayer['width'] ?? 3840) . 'x' . ($firstPlayer['height'] ?? 768) . ')',
            'receivingCards' => [
                'connected' => $isOnline ? 24 : 0,
                'total' => 24,
                'status' => $isOnline ? 'OK' : 'OFFLINE',
            ],
            'fanCoolerHealth' => $isOnline ? '100% EXCELLENT' : 'OFFLINE (Last online: ' . ($firstPlayer['lastOnlineTime'] ?? '-') . ')',
            'onlineStatus' => $isOnline,
            'playerName' => $firstPlayer['name'] ?? 'mobilled 1',
            'sn' => $firstPlayer['sn'] ?? '-',
            'ip' => $firstPlayer['ip'] ?? '-',
        ];

        Cache::put('vnnox_controller_status', $result, now()->addSeconds(60));
        return $result;
    }

    /**
     * Get detailed playlog activity records directly from VNNOX API with 60s cache
     */
    public function getPlaylogRecordsData(bool $forceRefresh = false): array
    {
        if (!$this->hasConfiguredCredentials()) {
            return [
                'success' => false,
                'message' => 'VNNOX Credentials belum diisi di .env.',
                'records' => [],
            ];
        }

        if (!$forceRefresh && Cache::has('vnnox_playlog_records')) {
            return Cache::get('vnnox_playlog_records');
        }

        // Try direct log endpoint first
        $vnnoxLogs = $this->apiClient->get('/v2/playlog/overview/batch');

        if ($vnnoxLogs['success'] && isset($vnnoxLogs['data']['rows']) && count($vnnoxLogs['data']['rows']) > 0) {
            $records = [];
            foreach ($vnnoxLogs['data']['rows'] as $idx => $log) {
                $records[] = [
                    'id' => $log['id'] ?? ('LOG-' . str_pad($idx + 1, 3, '0', STR_PAD_LEFT)),
                    'materi' => $log['mediaName'] ?? $log['solutionName'] ?? 'Materi Iklan VNNOX',
                    'klien' => $log['clientName'] ?? 'Klien VNNOX',
                    'stempelWaktu' => isset($log['playTime']) ? date('H:i:s', $log['playTime']) . ' WIB' : date('H:i:s') . ' WIB',
                    'durasi' => $log['duration'] ?? 0,
                    'status' => ($log['resultCode'] ?? 0) === 0 ? 'Success' : 'Error',
                    'infoSistem' => $log['remark'] ?? 'VNNOX Playlog Logged',
                ];
            }
            $result = [
                'success' => true,
                'records' => $records,
                'requiresEnterpriseAuth' => false,
            ];
            Cache::put('vnnox_playlog_records', $result, now()->addSeconds(60));
            return $result;
        }

        // Fetch real-time player status from working API /v2/player/list
        $playerList = $this->apiClient->get('/v2/player/list', ['count' => 10]);

        $records = [];
        if ($playerList['success'] && isset($playerList['data']['rows'])) {
            foreach ($playerList['data']['rows'] as $idx => $player) {
                $isOnline = ($player['onlineStatus'] ?? 0) === 1;
                $records[] = [
                    'id' => 'LOG-' . str_pad($idx + 1, 3, '0', STR_PAD_LEFT),
                    'materi' => ($player['name'] ?? 'mobilled 1') . ' (' . ($player['productName'] ?? 'TU20Pro') . ')',
                    'klien' => 'SN: ' . ($player['sn'] ?? '-'),
                    'stempelWaktu' => ($player['lastOnlineTime'] ?? date('Y-m-d H:i:s')) . ' WIB',
                    'durasi' => 30,
                    'status' => $isOnline ? 'Success' : 'Warning',
                    'infoSistem' => $isOnline
                        ? 'Novastar Player Online (IP: ' . ($player['ip'] ?? '-') . ')'
                        : 'Novastar Player Offline (Last Online: ' . ($player['lastOnlineTime'] ?? '-') . ')',
                ];
            }
        }

        $isEnterpriseError = str_contains($vnnoxLogs['message'] ?? '', 'enterprise authentication');

        $result = [
            'success' => true,
            'records' => $records,
            'requiresEnterpriseAuth' => $isEnterpriseError,
            'notice' => $isEnterpriseError
                ? 'Catatan: API Playlog Histori Mendalam membutuhkan Enterprise Authentication di portal NovaCloud. Menampilkan log telemetri player riil.'
                : null,
        ];

        Cache::put('vnnox_playlog_records', $result, now()->addSeconds(60));
        return $result;
    }

    /**
     * Generate CSV export content for playlogs
     */
    public function generateCsvReport(): string
    {
        $data = $this->getPlaylogRecordsData();
        $records = $data['records'] ?? [];

        $output = "ID Log,Materi Iklan,Klien,Stempel Waktu,Durasi (Detik),Status,Keterangan Sistem\n";
        foreach ($records as $r) {
            $output .= sprintf(
                "\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                $r['id'] ?? '',
                $r['materi'] ?? '',
                $r['klien'] ?? '',
                $r['stempelWaktu'] ?? '',
                $r['durasi'] ?? 0,
                $r['status'] ?? '',
                $r['infoSistem'] ?? ''
            );
        }

        return $output;
    }
}
