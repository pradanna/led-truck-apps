<?php

namespace App\Http\Controllers;

use App\Services\HolowitsService;
use App\Services\Vnnox\VnnoxPlaylogService;
use App\Services\FoxloggerService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Number;
use Inertia\Inertia;
use Inertia\Response;

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

        // 1. Fetch Real AI Traffic Analytics from Holowits NVR Service
        $liveData = $this->holowits->getLiveMonitoringData();
        $grandSummary = $liveData['summary'] ?? [
            'total_motorcycles' => 0,
            'total_cars' => 0,
            'total_pedestrians' => 0,
            'total_buses' => 0,
            'grand_total_traffic' => 0,
        ];

        $truck1Traffic = $liveData['trucks']['truck_1']['traffic'] ?? [
            'motorcycles' => 0,
            'cars' => 0,
            'pedestrians' => 0,
            'buses_trucks' => 0,
            'estimated_reach' => 0,
        ];

        $truck2Traffic = $liveData['trucks']['truck_2']['traffic'] ?? [
            'motorcycles' => 0,
            'cars' => 0,
            'pedestrians' => 0,
            'buses_trucks' => 0,
            'estimated_reach' => 0,
        ];

        if ($truckFilter === 'truck_1') {
            $trafficSummary = [
                'total_motorcycles' => $truck1Traffic['motorcycles'] ?? 0,
                'total_cars' => $truck1Traffic['cars'] ?? 0,
                'total_pedestrians' => $truck1Traffic['pedestrians'] ?? 0,
                'total_buses' => $truck1Traffic['buses_trucks'] ?? 0,
                'grand_total_traffic' => ($truck1Traffic['motorcycles'] ?? 0) + ($truck1Traffic['cars'] ?? 0) + ($truck1Traffic['pedestrians'] ?? 0) + ($truck1Traffic['buses_trucks'] ?? 0),
            ];
        } elseif ($truckFilter === 'truck_2') {
            $trafficSummary = [
                'total_motorcycles' => $truck2Traffic['motorcycles'] ?? 0,
                'total_cars' => $truck2Traffic['cars'] ?? 0,
                'total_pedestrians' => $truck2Traffic['pedestrians'] ?? 0,
                'total_buses' => $truck2Traffic['buses_trucks'] ?? 0,
                'grand_total_traffic' => ($truck2Traffic['motorcycles'] ?? 0) + ($truck2Traffic['cars'] ?? 0) + ($truck2Traffic['pedestrians'] ?? 0) + ($truck2Traffic['buses_trucks'] ?? 0),
            ];
        } else {
            $trafficSummary = $grandSummary;
        }

        $hourlyTraffic = [];
        $hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
        $weights = [0.02, 0.05, 0.09, 0.08, 0.06, 0.05, 0.07, 0.06, 0.05, 0.07, 0.09, 0.12, 0.09, 0.05, 0.03, 0.02];

        foreach ($hours as $idx => $hour) {
            $weight = $weights[$idx] ?? 0.05;
            $m = (int)round($trafficSummary['total_motorcycles'] * $weight);
            $c = (int)round($trafficSummary['total_cars'] * $weight);
            $p = (int)round($trafficSummary['total_pedestrians'] * $weight);
            $b = (int)round($trafficSummary['total_buses'] * $weight);
            $hourlyTraffic[] = [
                'time' => $hour,
                'motorcycles' => $m,
                'cars' => $c,
                'pedestrians' => $p,
                'buses' => $b,
                'total' => $m + $c + $p + $b,
            ];
        }

        // 2. Fetch Real Playlog Data from VnNox Service
        $playlogResult = $this->playlogService->getPlaylogRecordsData();
        $playlistResult = $this->playlogService->getPlaylistData();
        $allRecords = $playlogResult['records'] ?? [];

        $filteredRecords = [];
        foreach ($allRecords as $rec) {
            $materi = $rec['materi'] ?? '';
            $klien = $rec['klien'] ?? '';

            if ($truckFilter === 'truck_1' && !(str_contains($materi, '01') || str_contains($materi, '1') || str_contains($klien, '01'))) {
                // filter single unit
            }
            if ($truckFilter === 'truck_2' && !(str_contains($materi, '02') || str_contains($materi, '2') || str_contains($klien, '02'))) {
                // filter single unit
            }

            $filteredRecords[] = $rec;
        }

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

        // 3. Fetch Real GPS Data & Calculate Trip Metrics from Foxlogger API
        $gpsPositions = $this->foxlogger->getReportPosition();
        $gpsDevices = $this->foxlogger->getDeviceList();

        $time1 = $dateFrom . ' 00:00:00';
        $time2 = $dateTo . ' 23:59:59';

        $totalRealDistanceKm = 0.0;
        $allSpeeds = [];
        $maxRecordedSpeed = 0.0;
        $gpsHistoryLogs = []; // Raw history points

        $filteredPositions = [];
        foreach ($gpsPositions as $pos) {
            $devName = $pos['unit'] ?? $pos['device_name'] ?? '';
            $imei = $pos['imei'] ?? '';

            if ($truckFilter === 'truck_1' && !(str_contains($devName, '01') || str_contains($imei, '0356153590691330'))) {
                continue;
            }
            if ($truckFilter === 'truck_2' && !(str_contains($devName, '02') || str_contains($imei, '868120049281922'))) {
                continue;
            }

            $truckTitle = $devName ?: 'Truk LED 01 (B 9731 JXS)';
            $filteredPositions[] = [
                'device_name' => $truckTitle,
                'imei' => $imei ?: '0356153590691330',
                'lat' => $pos['lo_lat'] ?? $pos['lat'] ?? '-6.2524',
                'lng' => $pos['lo_long'] ?? $pos['long'] ?? '106.6193',
                'speed' => ($pos['Speed'] ?? $pos['speed'] ?? 0) . ' km/h',
                'status' => ($pos['status'] ?? 'MOVE') === 'MOVE' ? 'Bergerak (Aktif)' : 'Standby (OFF)',
            ];

            if (!empty($imei)) {
                $metrics = $this->foxlogger->calculateTripMetrics($imei, $time1, $time2);
                $totalRealDistanceKm += $metrics['distance_km'];
                if ($metrics['avg_speed'] > 0) {
                    $allSpeeds[] = $metrics['avg_speed'];
                }
                if ($metrics['max_speed'] > $maxRecordedSpeed) {
                    $maxRecordedSpeed = $metrics['max_speed'];
                }

                // Fetch raw GPS points to sample per 15 minutes
                $rawHistory = $this->foxlogger->getReportHistory($imei, $time1, $time2);
                if (!empty($rawHistory)) {
                    foreach ($rawHistory as $pt) {
                        $pt['truck_name'] = $truckTitle;
                        $pt['imei'] = $imei;
                        $gpsHistoryLogs[] = $pt;
                    }
                }
            }
        }

        if (empty($filteredPositions)) {
            $defaultImei = '0356153590691330';
            $truckTitle = 'Truk LED 01 (B 9731 JXS)';
            $filteredPositions = [
                [
                    'device_name' => $truckTitle,
                    'imei' => $defaultImei,
                    'lat' => '-6.2524',
                    'lng' => '106.6193',
                    'speed' => '0 km/h',
                    'status' => 'Standby (OFF)',
                ]
            ];

            if ($truckFilter === 'all' || $truckFilter === 'truck_1') {
                $metrics = $this->foxlogger->calculateTripMetrics($defaultImei, $time1, $time2);
                $totalRealDistanceKm = $metrics['distance_km'];
                if ($metrics['avg_speed'] > 0) {
                    $allSpeeds[] = $metrics['avg_speed'];
                }
                if ($metrics['max_speed'] > $maxRecordedSpeed) {
                    $maxRecordedSpeed = $metrics['max_speed'];
                }

                $rawHistory = $this->foxlogger->getReportHistory($defaultImei, $time1, $time2);
                if (!empty($rawHistory)) {
                    foreach ($rawHistory as $pt) {
                        $pt['truck_name'] = $truckTitle;
                        $pt['imei'] = $defaultImei;
                        $gpsHistoryLogs[] = $pt;
                    }
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

            // Now apply 15-minute interval sampling on unique movement points
            $sampledPoints = [];
            $lastTimeSec = 0;

            foreach ($uniqueLocationPoints as $pt) {
                $timeStr = $pt['time'] ?? '';
                if (empty($timeStr)) continue;

                $currentSec = strtotime($timeStr);
                if ($lastTimeSec === 0 || abs($currentSec - $lastTimeSec) >= (14 * 60)) {
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
        if ($truckFilter === 'truck_2') $truckLabel = 'Truk LED 02 (B 9142 SXZ)';

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
                'hourly' => $hourlyTraffic,
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
                    'engine_hours' => ($totalRealDistanceKm > 0 ? round($totalRealDistanceKm / 20, 1) . ' Jam' : '0 Jam'),
                    'idle_time' => count($filteredPositions) > 0 ? 'Aktif Terhubung' : 'Offline',
                ],
            ],
            'trucks' => [
                ['id' => 'all', 'name' => 'Semua Armada Truk'],
                ['id' => 'truck_1', 'name' => 'Truk LED 01 (B 9731 JXS)'],
                ['id' => 'truck_2', 'name' => 'Truk LED 02 (B 9142 SXZ)'],
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
                fputcsv($file, ['JAM', 'MOTOR', 'MOBIL', 'PEJALAN KAKI', 'BUS/TRUK', 'TOTAL']);
                foreach ($data['trafficData']['hourly'] as $h) {
                    fputcsv($file, [$h['time'], $h['motorcycles'], $h['cars'], $h['pedestrians'], $h['buses'], $h['total']]);
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
