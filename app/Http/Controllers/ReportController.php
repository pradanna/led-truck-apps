<?php

namespace App\Http\Controllers;

use App\Models\AiTrafficDailyLog;
use App\Services\HolowitsService;
use App\Services\Vnnox\VnnoxPlaylogService;
use App\Services\FoxloggerService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Number;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Cache;

class ReportController extends Controller
{
    protected HolowitsService $holowits;
    protected VnnoxPlaylogService $playlogService;
    protected FoxloggerService $foxlogger;

    public function __construct(
        HolowitsService $holowits,
        VnnoxPlaylogService $playlogService,
        FoxloggerService $foxlogger
    ) {
        $this->holowits = $holowits;
        $this->playlogService = $playlogService;
        $this->foxlogger = $foxlogger;
    }

    /**
     * Helper to prepare common report data across views and exports
     */
    private function prepareReportData(Request $request): array
    {
        $truckFilter = $request->query('truck_id', 'all'); // 'all', 'truck_1', 'truck_2'
        $dateFrom = $request->query('date_from', now()->format('Y-m-d'));
        $dateTo = $request->query('date_to', now()->format('Y-m-d'));
        $tab = $request->query('tab', 'overview');
        $isExport = $request->routeIs('*.export*') || $request->has('export');

        // 1. Fetch AI Traffic Analytics dari database lokal (cron selalu update, tidak perlu NVR API)
        $allLogs = AiTrafficDailyLog::whereBetween('log_date', [$dateFrom, $dateTo])->get();

        $truck1Logs = $allLogs->where('truck_id', 'truck_1');
        $truck2Logs = $allLogs->where('truck_id', 'truck_2');

        $truck1Traffic = [
            'motorcycles'    => (int)$truck1Logs->sum('motorcycles'),
            'cars'           => (int)$truck1Logs->sum('cars'),
            'pedestrians'    => (int)$truck1Logs->sum('pedestrians'),
            'buses_trucks'   => (int)$truck1Logs->sum('buses_trucks'),
            'estimated_reach'=> (int)$truck1Logs->sum('estimated_reach'),
        ];

        $truck2Traffic = [
            'motorcycles'    => (int)$truck2Logs->sum('motorcycles'),
            'cars'           => (int)$truck2Logs->sum('cars'),
            'pedestrians'    => (int)$truck2Logs->sum('pedestrians'),
            'buses_trucks'   => (int)$truck2Logs->sum('buses_trucks'),
            'estimated_reach'=> (int)$truck2Logs->sum('estimated_reach'),
        ];

        $totalMotor = $truck1Traffic['motorcycles'] + $truck2Traffic['motorcycles'];
        $totalCars  = $truck1Traffic['cars'] + $truck2Traffic['cars'];
        $totalPeds  = $truck1Traffic['pedestrians'] + $truck2Traffic['pedestrians'];
        $totalBuses = $truck1Traffic['buses_trucks'] + $truck2Traffic['buses_trucks'];

        $grandSummary = [
            'total_motorcycles'   => $totalMotor,
            'total_cars'          => $totalCars,
            'total_pedestrians'   => $totalPeds,
            'total_buses'         => $totalBuses,
            'grand_total_traffic' => $totalMotor + $totalCars + $totalPeds + $totalBuses,
        ];

        if ($truckFilter === 'truck_1') {
            $trafficSummary = [
                'total_motorcycles'   => $truck1Traffic['motorcycles'],
                'total_cars'          => $truck1Traffic['cars'],
                'total_pedestrians'   => $truck1Traffic['pedestrians'],
                'total_buses'         => $truck1Traffic['buses_trucks'],
                'grand_total_traffic' => $truck1Traffic['motorcycles'] + $truck1Traffic['cars'] + $truck1Traffic['pedestrians'] + $truck1Traffic['buses_trucks'],
            ];
        } elseif ($truckFilter === 'truck_2') {
            $trafficSummary = [
                'total_motorcycles'   => $truck2Traffic['motorcycles'],
                'total_cars'          => $truck2Traffic['cars'],
                'total_pedestrians'   => $truck2Traffic['pedestrians'],
                'total_buses'         => $truck2Traffic['buses_trucks'],
                'grand_total_traffic' => $truck2Traffic['motorcycles'] + $truck2Traffic['cars'] + $truck2Traffic['pedestrians'] + $truck2Traffic['buses_trucks'],
            ];
        } else {
            $trafficSummary = $grandSummary;
        }

        // Daily traffic breakdown (Grafik & Tabel Perbandingan per Tanggal)
        $dailyTraffic = [];
        $startDate = \Carbon\Carbon::parse($dateFrom);
        $endDate = \Carbon\Carbon::parse($dateTo);

        for ($d = $startDate->copy(); $d->lte($endDate); $d->addDay()) {
            $dateStr = $d->format('Y-m-d');
            $dayLogs = $allLogs->filter(function($item) use ($dateStr, $truckFilter) {
                $itemDate = $item->log_date ? $item->log_date->format('Y-m-d') : '';
                if ($itemDate !== $dateStr) return false;
                if ($truckFilter !== 'all' && $item->truck_id !== $truckFilter) return false;
                return true;
            });

            $dMotor = (int)$dayLogs->sum('motorcycles');
            $dCars  = (int)$dayLogs->sum('cars');
            $dPeds  = (int)$dayLogs->sum('pedestrians');
            $dBuses = (int)$dayLogs->sum('buses_trucks');
            $dReach = (int)$dayLogs->sum('estimated_reach');
            $dTotal = $dMotor + $dCars + $dPeds + $dBuses;

            $dailyTraffic[] = [
                'date' => $dateStr,
                'formatted_date' => $d->translatedFormat('d M Y'),
                'day_name' => $d->translatedFormat('l'),
                'motorcycles' => $dMotor,
                'cars' => $dCars,
                'pedestrians' => $dPeds,
                'buses' => $dBuses,
                'estimated_reach' => $dReach,
                'total' => $dTotal,
            ];
        }

        // 2. Fetch Playlog Data: Check Database Archive First, Fallback to Cache/Live VNNOX Service
        $dbPlaylogQuery = \App\Models\VnnoxPlaylogLog::whereBetween('log_date', [$dateFrom, $dateTo]);
        if ($truckFilter !== 'all') {
            $dbPlaylogQuery->where('truck_id', $truckFilter);
        }
        $dbPlaylogs = $dbPlaylogQuery->orderBy('play_time', 'desc')->get();

        $filteredRecords = [];
        if ($dbPlaylogs->count() > 0) {
            foreach ($dbPlaylogs as $idx => $dbLog) {
                $filteredRecords[] = [
                    'id' => 'LOG-' . str_pad($idx + 1, 3, '0', STR_PAD_LEFT),
                    'materi' => $dbLog->media_name,
                    'klien' => $dbLog->client_name ?: 'Klien Umum',
                    'stempelWaktu' => $dbLog->play_time ?: ($dbLog->log_date->format('Y-m-d') . ' WIB'),
                    'durasi' => $dbLog->duration,
                    'status' => $dbLog->status,
                    'infoSistem' => $dbLog->info_system ?: 'Tercatat di Database Server',
                    'truckId' => $dbLog->truck_id,
                ];
            }
        } else {
            // Live cache fallback
            $playlogResult = $isExport
                ? $this->playlogService->getPlaylogRecordsData(true, $truckFilter === 'all' ? 'truck_1' : $truckFilter)
                : Cache::get("vnnox_playlog_records_{$truckFilter}", Cache::get('vnnox_playlog_records_truck_1', ['records' => []]));
            $allRecords = $playlogResult['records'] ?? [];

            foreach ($allRecords as $rec) {
                $filteredRecords[] = $rec;
                // Auto-archive live records to DB
                try {
                    \App\Models\VnnoxPlaylogLog::recordLog(
                        $rec['truckId'] ?? ($truckFilter === 'all' ? 'truck_1' : $truckFilter),
                        date('Y-m-d'),
                        $rec
                    );
                } catch (\Throwable $e) {}
            }
        }

        $playlistResult = $isExport
            ? $this->playlogService->getPlaylistData(true, $truckFilter === 'all' ? 'truck_1' : $truckFilter)
            : Cache::get("vnnox_playlist_data_{$truckFilter}", Cache::get('vnnox_playlist_data_truck_1', ['items' => []]));

        $totalPlays = count($filteredRecords);
        $totalPlaySeconds = 0;
        foreach ($filteredRecords as $rec) {
            $totalPlaySeconds += (int)($rec['durasi'] ?? $rec['duration'] ?? 30);
        }
        $totalPlayHours = $totalPlaySeconds > 0 ? round($totalPlaySeconds / 3600, 2) : 0;

        $topCampaigns = [];
        $playlistItems = $playlistResult['items'] ?? [];
        if (!empty($playlistItems)) {
            foreach ($playlistItems as $item) {
                $topCampaigns[] = [
                    'name' => $item['title'] ?? 'Media Playlist',
                    'brand' => $item['client'] ?? 'Klien',
                    'plays' => $item['impressions'] ?? ($item['onlineStatus'] ? 1 : 0),
                    'duration' => ($item['duration'] ?? 30) . 's',
                    'reach' => ($trafficSummary['grand_total_traffic'] ?? 0) > 0 ? Number::abbreviate($trafficSummary['grand_total_traffic']) : '0 Audiens',
                    'status' => $item['status'] ?? 'ACTIVE',
                ];
            }
        }

        // 3. Fetch Real GPS Data & Calculate Trip Metrics (instant cache on page view)
        // 3. Fetch Real GPS Data & Calculate Trip Metrics (Check DB first, fallback to Foxlogger)
        // Ensure fresh data: Check Cache, then DB, then live Foxlogger API
        $gpsPositions = $isExport 
            ? $this->foxlogger->getReportPosition(true)
            : $this->foxlogger->getReportPosition();
        $gpsDevices = $isExport
            ? $this->foxlogger->getDeviceList(true)
            : $this->foxlogger->getDeviceList();

        $time1 = $dateFrom . ' 00:00:00';
        $time2 = ($dateTo === date('Y-m-d')) ? date('Y-m-d H:i:s') : ($dateTo . ' 23:59:59');

        $totalRealDistanceKm = 0.0;
        $allSpeeds = [];
        $maxRecordedSpeed = 0.0;
        $totalEngineSeconds = 0;
        $totalIdleSeconds = 0;
        $gpsHistoryLogs = [];

        // Define known truck devices mapping
        $targetDevices = [];
        if ($truckFilter === 'all') {
            $targetDevices = [
                '0356153590691330' => 'Truk LED 01 (B 9731 JXS)',
                '0866833070213829' => 'Truk LED 02 (B 9729 JXS)',
            ];
        } elseif ($truckFilter === 'truck_1') {
            $targetDevices = [
                '0356153590691330' => 'Truk LED 01 (B 9731 JXS)',
            ];
        } elseif ($truckFilter === 'truck_2') {
            $targetDevices = [
                '0866833070213829' => 'Truk LED 02 (B 9729 JXS)',
            ];
        }

        $filteredPositions = [];
        foreach ($gpsPositions as $pos) {
            $devName = $pos['unit'] ?? $pos['device_name'] ?? '';
            $imei = $pos['imei'] ?? '';

            if ($truckFilter === 'truck_1' && !(str_contains($devName, '01') || str_contains($devName, '9731') || str_contains($imei, '0356153590691330'))) {
                continue;
            }
            if ($truckFilter === 'truck_2' && !(str_contains($devName, '02') || str_contains($devName, '9729') || str_contains($imei, '0866833070213829'))) {
                continue;
            }

            $truckTitle = $devName ?: ($truckFilter === 'truck_2' ? 'Truk LED 02 (B 9729 JXS)' : 'Truk LED 01 (B 9731 JXS)');
            $filteredPositions[] = [
                'device_name' => $truckTitle,
                'imei' => $imei ?: '0356153590691330',
                'lat' => $pos['lo_lat'] ?? $pos['lat'] ?? '-6.2524',
                'lng' => $pos['lo_long'] ?? $pos['long'] ?? '106.6193',
                'speed' => ($pos['Speed'] ?? $pos['speed'] ?? 0) . ' km/h',
                'status' => ($pos['status'] ?? 'MOVE') === 'MOVE' ? 'Bergerak (Aktif)' : 'Standby (OFF)',
            ];
        }

        // Fallback default position if not returned by live API/cache
        if (empty($filteredPositions)) {
            foreach ($targetDevices as $tImei => $tTitle) {
                // Check latest point from DB
                $latestDbLog = \App\Models\GpsTelemetryLog::where('imei', $tImei)
                    ->orderBy('logged_at', 'desc')
                    ->first();

                if ($latestDbLog) {
                    $filteredPositions[] = [
                        'device_name' => $latestDbLog->truck_plate ?: $tTitle,
                        'imei' => $tImei,
                        'lat' => (string)$latestDbLog->latitude,
                        'lng' => (string)$latestDbLog->longitude,
                        'speed' => ((int)$latestDbLog->speed) . ' km/h',
                        'status' => $latestDbLog->status === 'MOVE' ? 'Bergerak (Aktif)' : 'Standby (OFF)',
                    ];
                } else {
                    $filteredPositions[] = [
                        'device_name' => $tTitle,
                        'imei' => $tImei,
                        'lat' => '-6.2524',
                        'lng' => '106.6193',
                        'speed' => '0 km/h',
                        'status' => 'Standby (OFF)',
                    ];
                }
            }
        }

        // Always query history logs and metrics across all targeted device IMEIs (Check DB first, then Foxlogger)
        foreach ($targetDevices as $imei => $truckTitle) {
            // 1. Calculate Metrics (FoxloggerService calculateTripMetrics checks DB first!)
            $metrics = $this->foxlogger->calculateTripMetrics($imei, $time1, $time2);
            $totalRealDistanceKm += $metrics['distance_km'];
            $totalEngineSeconds += ($metrics['engine_seconds'] ?? 0);
            $totalIdleSeconds += ($metrics['idle_seconds'] ?? 0);
            if ($metrics['avg_speed'] > 0) {
                $allSpeeds[] = $metrics['avg_speed'];
            }
            if ($metrics['max_speed'] > $maxRecordedSpeed) {
                $maxRecordedSpeed = $metrics['max_speed'];
            }

            // 2. Fetch GPS history checkpoints (FoxloggerService getReportHistory checks DB first!)
            $rawHistory = $this->foxlogger->getReportHistory($imei, $time1, $time2);
            if (!empty($rawHistory)) {
                foreach ($rawHistory as $pt) {
                    $pt['truck_name'] = $truckTitle;
                    $pt['imei'] = $imei;
                    $gpsHistoryLogs[] = $pt;
                }
            }
        }

        // Process 15-Minute Sampling & Group By Date
        $groupedGpsLogs = [];
        if (!empty($gpsHistoryLogs)) {
            // Sort by time ascending first
            usort($gpsHistoryLogs, function($a, $b) {
                return strcmp($a['time'] ?? '', $b['time'] ?? '');
            });

            // Filter unique location / movement change points (same logic as GpsTracking page)
            $uniqueLocationPoints = [];
            foreach ($gpsHistoryLogs as $pt) {
                if (empty($uniqueLocationPoints)) {
                    $uniqueLocationPoints[] = $pt;
                } else {
                    $prev = end($uniqueLocationPoints);
                    $isSameAddress = !empty($pt['addr']) && !empty($prev['addr']) && trim($pt['addr']) === trim($prev['addr']);
                    $isSameCoord = abs((float)($pt['lat'] ?? 0) - (float)($prev['lat'] ?? 0)) < 0.0001 
                                && abs((float)($pt['long'] ?? $pt['lng'] ?? 0) - (float)($prev['long'] ?? $prev['lng'] ?? 0)) < 0.0001;
                    
                    if (!$isSameAddress && !$isSameCoord) {
                        $uniqueLocationPoints[] = $pt;
                    }
                }
            }

            // Apply 1-minute interval sampling on unique movement points
            $sampledPoints = [];
            $lastTimeSec = 0;

            foreach ($uniqueLocationPoints as $pt) {
                $timeStr = $pt['time'] ?? '';
                if (empty($timeStr)) continue;

                $currentSec = strtotime($timeStr);
                if ($lastTimeSec === 0 || abs($currentSec - $lastTimeSec) >= 60) {
                    $sampledPoints[] = $pt;
                    $lastTimeSec = $currentSec;
                }
            }

            // Group by Date (YYYY-MM-DD)
            foreach ($sampledPoints as $pt) {
                $timeStr = $pt['time'] ?? '';
                $dateKey = substr($timeStr, 0, 10);
                if (!isset($groupedGpsLogs[$dateKey])) {
                    $groupedGpsLogs[$dateKey] = [
                        'date' => $dateKey,
                        'formatted_date' => date('d F Y', strtotime($dateKey)),
                        'logs' => [],
                    ];
                }

                $speedVal = (float)($pt['Speed'] ?? $pt['speed'] ?? 0);
                $rawStatus = strtoupper(trim($pt['status'] ?? ''));
                $engiStatus = strtoupper(trim($pt['engi'] ?? ''));

                $isMoving = ($speedVal > 0) || ($rawStatus === 'MOVE') || ($rawStatus === 'ONLINE');
                $statusText = $isMoving ? 'Bergerak (Aktif)' : ($engiStatus === 'ON' ? 'Standby (Mesin ON)' : 'Berhenti (Parkir)');

                $groupedGpsLogs[$dateKey]['logs'][] = [
                    'time' => date('H:i:s', strtotime($timeStr)) . ' WIB',
                    'full_time' => $timeStr,
                    'truck_name' => $pt['truck_name'] ?? 'Truk LED 01',
                    'imei' => $pt['imei'] ?? '-',
                    'lat' => round((float)($pt['lat'] ?? 0), 6),
                    'lng' => round((float)($pt['long'] ?? $pt['lng'] ?? 0), 6),
                    'speed' => round($speedVal, 1) . ' km/h',
                    'status' => $statusText,
                    'is_moving' => $isMoving,
                    'address' => $pt['addr'] ?? $pt['address'] ?? 'Jalan Curug Sangereng Raya, Gading Serpong, Tangerang',
                ];
            }

            // Sort dates descending (newest day first)
            krsort($groupedGpsLogs);
            // Reverse log points inside each day to show newest interval first
            foreach ($groupedGpsLogs as &$dayGroup) {
                $dayGroup['logs'] = array_reverse($dayGroup['logs']);
            }
            $groupedGpsLogs = array_values($groupedGpsLogs);
        }

        $avgSpeedFormatted = count($allSpeeds) > 0 ? (round(array_sum($allSpeeds) / count($allSpeeds), 1) . ' km/jam') : '0.0 km/jam';
        $maxSpeedFormatted = $maxRecordedSpeed > 0 ? ($maxRecordedSpeed . ' km/jam') : '0.0 km/jam';

        $truckLabel = 'Semua Armada';
        if ($truckFilter === 'truck_1') $truckLabel = 'Truk LED 01 (B 9731 JXS)';
        if ($truckFilter === 'truck_2') $truckLabel = 'Truk LED 02 (B 9729 JXS)';

        $engineHoursFormatted = '0 Jam';
        if ($totalEngineSeconds > 0) {
            $hours = floor($totalEngineSeconds / 3600);
            $minutes = round(($totalEngineSeconds % 3600) / 60);
            $engineHoursFormatted = $hours > 0 ? "{$hours} Jam {$minutes}m" : "{$minutes} Menit";
        } elseif ($totalRealDistanceKm > 0) {
            // Backup calculation from distance and average moving speed
            $estHours = round($totalRealDistanceKm / max(array_sum($allSpeeds) / max(count($allSpeeds), 1), 25), 1);
            $engineHoursFormatted = "{$estHours} Jam";
        }

        $idleFormatted = '0 Jam';
        if ($totalIdleSeconds > 0) {
            $iHours = floor($totalIdleSeconds / 3600);
            $iMins = round(($totalIdleSeconds % 3600) / 60);
            $idleFormatted = $iHours > 0 ? "{$iHours} Jam {$iMins}m" : "{$iMins} Menit";
        } elseif (count($filteredPositions) > 0) {
            $idleFormatted = '0 Jam (Bergerak Penuh)';
        }

        return [
            'tab' => $tab,
            'truckFilter' => $truckFilter,
            'truckLabel' => $truckLabel,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'summaryKPI' => [
                'total_plays' => $totalPlays,
                'total_play_hours' => $totalPlayHours,
                'total_distance_km' => round($totalRealDistanceKm, 2),
                'total_traffic_reach' => $trafficSummary['grand_total_traffic'] ?? 0,
                'operational_efficiency' => count($filteredPositions) > 0 ? '100%' : '0%',
            ],
            'trafficData' => [
                'summary' => $trafficSummary,
                'truck_1' => $truck1Traffic,
                'truck_2' => $truck2Traffic,
                'daily' => $dailyTraffic,
                'hourly' => $dailyTraffic, // backward compatibility
            ],
            'playlogData' => [
                'records' => $filteredRecords,
                'topCampaigns' => $topCampaigns,
                'playlist' => $playlistItems,
            ],
            'gpsData' => [
                'positions' => $filteredPositions,
                'devices' => $gpsDevices,
                'groupedLogs' => $groupedGpsLogs,
                'stats' => [
                    'avg_speed' => $avgSpeedFormatted,
                    'max_speed' => $maxSpeedFormatted,
                    'engine_hours' => $engineHoursFormatted,
                    'idle_time' => $idleFormatted,
                ],
            ],
            'trucks' => [
                ['id' => 'all', 'name' => 'Semua Armada Truk'],
                ['id' => 'truck_1', 'name' => 'Truk LED 01 (B 9731 JXS)'],
                ['id' => 'truck_2', 'name' => 'Truk LED 02 (B 9729 JXS)'],
            ]
        ];
    }

    /**
     * Display comprehensive Detailed Reports Page with Tabs
     */
    public function index(Request $request): Response
    {
        $data = $this->prepareReportData($request);

        return Inertia::render('ReportDetail', [
            'filters' => [
                'truck_id' => $data['truckFilter'],
                'date_from' => $data['dateFrom'],
                'date_to' => $data['dateTo'],
                'tab' => $data['tab'],
            ],
            'summaryKPI' => $data['summaryKPI'],
            'trafficData' => $data['trafficData'],
            'playlogData' => $data['playlogData'],
            'gpsData' => $data['gpsData'],
            'trucks' => $data['trucks'],
        ]);
    }

    /**
     * Export Per-Tab PDF using DomPDF
     */
    public function exportPdf(Request $request)
    {
        $data = $this->prepareReportData($request);
        $tab = $request->query('tab', 'overview');

        $tabNames = [
            'overview' => 'Ringkasan_Eksekutif',
            'traffic' => 'AI_Traffic_Analytics',
            'playlog' => 'Log_Pemutaran_Iklan',
            'gps' => 'Laporan_Rute_GPS',
        ];

        $reportTitle = [
            'overview' => 'Laporan Ringkasan Eksekutif Kampanye',
            'traffic' => 'Laporan Pengamatan AI Traffic Audiens',
            'playlog' => 'Laporan Riwayat Penayangan Iklan',
            'gps' => 'Laporan Telemetri Rute & GPS Armada',
        ];

        $fileName = "Laporan_" . ($tabNames[$tab] ?? 'Detail') . "_{$data['dateFrom']}_sd_{$data['dateTo']}.pdf";

        $pdf = Pdf::loadView('reports.detail_pdf', array_merge($data, [
            'title' => $reportTitle[$tab] ?? 'Laporan Operasional',
            'reportName' => $reportTitle[$tab] ?? 'Laporan Operasional',
            'generatedAt' => now()->translatedFormat('d F Y H:i') . ' WIB'
        ]))->setPaper('a4', 'portrait');

        return $pdf->download($fileName);
    }

    /**
     * Export Per-Tab Excel (CSV format)
     */
    public function exportExcel(Request $request)
    {
        $data = $this->prepareReportData($request);
        $tab = $request->query('tab', 'overview');

        $tabNames = [
            'overview' => 'Ringkasan_Eksekutif',
            'traffic' => 'AI_Traffic_Analytics',
            'playlog' => 'Log_Pemutaran_Iklan',
            'gps' => 'Laporan_Rute_GPS',
        ];

        $fileName = "Laporan_" . ($tabNames[$tab] ?? 'Detail') . "_{$data['dateFrom']}_sd_{$data['dateTo']}.csv";

        $headers = [
            "Content-type"        => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename={$fileName}",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function() use ($data, $tab) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM for Excel

            if ($tab === 'overview') {
                fputcsv($file, ['METRIK RINGKASAN', 'NILAI']);
                fputcsv($file, ['Total Penayangan', $data['summaryKPI']['total_plays'] . ' Spot']);
                fputcsv($file, ['Durasi Tayang', $data['summaryKPI']['total_play_hours'] . ' Jam']);
                fputcsv($file, ['Total Jarak Tempuh', $data['summaryKPI']['total_distance_km'] . ' KM']);
                fputcsv($file, ['Estimasi Traffic Reach', $data['summaryKPI']['total_traffic_reach']]);
                fputcsv($file, []);
                fputcsv($file, ['NO', 'MATERI IKLAN', 'BRAND / KLIEN', 'DURASI', 'STATUS']);
                foreach ($data['playlogData']['topCampaigns'] as $idx => $c) {
                    fputcsv($file, [$idx + 1, $c['name'], $c['brand'], $c['duration'], $c['status']]);
                }
            } elseif ($tab === 'traffic') {
                fputcsv($file, ['KATEGORI TRAFFIC', 'TOTAL UNIT TERDETEKSI']);
                fputcsv($file, ['Sepeda Motor', $data['trafficData']['summary']['total_motorcycles']]);
                fputcsv($file, ['Mobil Pribadi', $data['trafficData']['summary']['total_cars']]);
                fputcsv($file, ['Pejalan Kaki', $data['trafficData']['summary']['total_pedestrians']]);
                fputcsv($file, ['Bus & Truk', $data['trafficData']['summary']['total_buses']]);
                fputcsv($file, ['GRAND TOTAL TRAFFIC', $data['trafficData']['summary']['grand_total_traffic']]);
                fputcsv($file, []);
                fputcsv($file, ['TANGGAL', 'HARI', 'MOTOR', 'MOBIL', 'PEJALAN KAKI', 'BUS/TRUK', 'TOTAL', 'EST. REACH']);
                foreach ($data['trafficData']['daily'] as $d) {
                    fputcsv($file, [$d['date'], $d['day_name'] ?? '-', $d['motorcycles'], $d['cars'], $d['pedestrians'], $d['buses'], $d['total'], $d['estimated_reach']]);
                }
            } elseif ($tab === 'playlog') {
                fputcsv($file, ['NO', 'WAKTU PEMUTARAN', 'MATERI IKLAN', 'KLIEN', 'DURASI (DETIK)', 'STATUS']);
                foreach ($data['playlogData']['records'] as $idx => $r) {
                    fputcsv($file, [
                        $idx + 1,
                        $r['stempelWaktu'] ?? '-',
                        $r['materi'] ?? '-',
                        $r['klien'] ?? '-',
                        $r['durasi'] ?? 30,
                        $r['status'] ?? 'Sukses'
                    ]);
                }
            } elseif ($tab === 'gps') {
                fputcsv($file, ['NO', 'TANGGAL', 'WAKTU', 'ARMADA', 'IMEI', 'LATITUDE', 'LONGITUDE', 'KECEPATAN', 'STATUS MESIN', 'ALAMAT']);
                $counter = 1;
                foreach ($data['gpsData']['groupedLogs'] ?? [] as $group) {
                    foreach ($group['logs'] ?? [] as $log) {
                        fputcsv($file, [
                            $counter++,
                            $group['date'] ?? '-',
                            $log['time'] ?? '-',
                            $log['truck_name'] ?? '-',
                            $log['imei'] ?? '-',
                            $log['lat'] ?? '-',
                            $log['lng'] ?? '-',
                            $log['speed'] ?? '-',
                            $log['status'] ?? '-',
                            $log['address'] ?? '-'
                        ]);
                    }
                }
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
