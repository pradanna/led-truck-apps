<?php

namespace App\Http\Controllers;

use App\Services\FoxloggerService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Barryvdh\DomPDF\Facade\Pdf;

class GpsTrackingController extends Controller
{
    protected FoxloggerService $foxlogger;

    public function __construct(FoxloggerService $foxlogger)
    {
        $this->foxlogger = $foxlogger;
    }

    public function index(Request $request): Response
    {
        // Fetch devices and positions with 1-minute freshness check & DB/Foxlogger fallback
        $devices = $this->foxlogger->getDeviceList();
        $positions = $this->foxlogger->getReportPosition();
        $session = $this->foxlogger->getValidSession();

        return Inertia::render('GpsTracking', [
            'realDevices' => $devices,
            'realPositions' => $positions,
            'tokenSession' => [
                'hasToken' => !empty($session['access_token']),
                'updatedAt' => $session['updated_at'] ?? null,
            ]
        ]);
    }

    /**
     * Force refresh live positions and sync full day history directly from Foxlogger API
     */
    public function liveSync(Request $request)
    {
        $devices = $this->foxlogger->getDeviceList(true);
        $positions = $this->foxlogger->getReportPosition(true);

        // Also fetch and archive today's history for all active trucks to DB
        $targetImeis = ['0356153590691330', '0866833070213829'];
        $today = date('Y-m-d');
        foreach ($targetImeis as $imei) {
            try {
                $this->foxlogger->getGpsHistory($imei, $today, true);
            } catch (\Throwable $t) {}
        }

        return response()->json([
            'success' => true,
            'message' => 'Data GPS berhasil disinkronkan langsung dari Foxlogger.',
            'devices' => $devices,
            'positions' => $positions,
            'synced_at' => now()->translatedFormat('H:i:s') . ' WIB',
        ]);
    }

    public function refreshToken(Request $request)
    {
        $providedToken = $request->input('refresh_token');
        $session = $this->foxlogger->refreshToken($providedToken);

        if ($session && !empty($session['access_token'])) {
            return response()->json([
                'success' => true,
                'message' => 'Token GPS berhasil diperbarui.',
                'data' => [
                    'updated_at' => $session['updated_at'] ?? now()->toDateTimeString(),
                    'user_id' => $session['user_id'] ?? null,
                ]
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Gagal memperbarui token GPS.'
        ], 400);
    }

    public function getGpsHistory(Request $request, string $imei)
    {
        $date = $request->query('date', date('Y-m-d'));
        $forceRefresh = $request->boolean('refresh');

        $time1 = $date . ' 00:00:00';
        $time2 = ($date === date('Y-m-d')) ? date('Y-m-d H:i:s') : ($date . ' 23:59:59');

        // 1. Direct fetch from Local Database (Ultra fast <10ms)
        $dbLogs = \App\Models\GpsTelemetryLog::where('imei', $imei)
            ->where(function ($q) use ($date, $time1, $time2) {
                $q->where('log_date', $date)
                  ->orWhereBetween('logged_at', [$time1, $time2]);
            })
            ->orderBy('logged_at', 'asc')
            ->get();

        $history = [];

        if ($dbLogs->count() > 0 && !$forceRefresh) {
            $history = $dbLogs->map(function ($log) {
                return [
                    'time' => $log->logged_at->format('Y-m-d H:i:s'),
                    'lat' => (string)$log->latitude,
                    'long' => (string)$log->longitude,
                    'Speed' => (int)$log->speed,
                    'speed' => (int)$log->speed,
                    'addr' => $log->address,
                    'status' => $log->status,
                    'engi' => $log->engine_status,
                    'Mill' => $log->mileage_km,
                    'unit' => $log->truck_plate,
                    'imei' => $log->imei,
                ];
            })->toArray();
        } else {
            // Pull from Foxlogger API (will automatically save new points to DB)
            $history = $this->foxlogger->getGpsHistory($imei, $date, true);
        }

        // Smart Server-Side Downsampling / Compression (1-Minute Sampling)
        // Reduces raw telemetry points to 1-minute checkpoints
        $sampledHistory = [];
        $lastTimeSec = 0;

        foreach ($history as $pt) {
            $lat = (float)($pt['lat'] ?? $pt['latitude'] ?? 0);
            $lng = (float)($pt['long'] ?? $pt['longitude'] ?? 0);
            if ($lat == 0 && $lng == 0) continue;

            $timeStr = $pt['time'] ?? $pt['last_upd'] ?? '';
            $currentSec = !empty($timeStr) ? strtotime($timeStr) : 0;

            // Keep first point
            if (empty($sampledHistory)) {
                $sampledHistory[] = $pt;
                $lastTimeSec = $currentSec;
                continue;
            }

            $timeDiff = abs($currentSec - $lastTimeSec);

            // Sample checkpoint every 1 minute (60 seconds)
            if ($timeDiff >= 60) {
                $sampledHistory[] = $pt;
                $lastTimeSec = $currentSec;
            }
        }

        // Always ensure the very last point of the day is included
        if (!empty($history) && count($history) > 1) {
            $lastOriginal = end($history);
            $lastSampled = end($sampledHistory);
            if (($lastOriginal['time'] ?? '') !== ($lastSampled['time'] ?? '')) {
                $sampledHistory[] = $lastOriginal;
            }
        }

        // Return up to 100-200 newest sampled points if extensive
        $finalData = !empty($sampledHistory) ? $sampledHistory : $history;

        return response()->json([
            'success' => true,
            'imei' => $imei,
            'date' => $date,
            'count' => count($finalData),
            'raw_count' => count($history),
            'data' => $finalData,
        ]);
    }

    public function exportExcel(Request $request)
    {
        $imei = $request->query('imei', '');
        $date = $request->query('date', date('Y-m-d'));
        $history = $this->foxlogger->getGpsHistory($imei, $date);

        $filename = "Laporan_GPS_{$imei}_{$date}.csv";

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename={$filename}",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['No', 'IMEI / Truk', 'Timestamp GPS', 'Kecepatan (km/h)', 'Status', 'Latitude', 'Longitude', 'Alamat'];

        $callback = function() use($history, $columns, $imei) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($history as $idx => $row) {
                fputcsv($file, [
                    $idx + 1,
                    $imei,
                    $row['time'] ?? '-',
                    $row['speed'] ?? 0,
                    $row['status'] ?? '-',
                    $row['lat'] ?? '-',
                    $row['lng'] ?? '-',
                    $row['address'] ?? '-'
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportPdf(Request $request)
    {
        $imei = $request->query('imei', '');
        $date = $request->query('date', date('Y-m-d'));
        $history = $this->foxlogger->getGpsHistory($imei, $date);

        $pdf = Pdf::loadView('reports.gps_pdf', [
            'imei' => $imei,
            'date' => $date,
            'history' => $history,
            'generatedAt' => now()->translatedFormat('d F Y H:i:s')
        ]);

        return $pdf->download("Laporan_GPS_{$imei}_{$date}.pdf");
    }
}
