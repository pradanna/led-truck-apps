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
        $session = $this->foxlogger->getValidSession();
        $devices = $this->foxlogger->getDeviceList();
        $positions = $this->foxlogger->getReportPosition();

        return Inertia::render('GpsTracking', [
            'realDevices' => $devices,
            'realPositions' => $positions,
            'tokenSession' => [
                'hasToken' => !empty($session['access_token']),
                'updatedAt' => $session['updated_at'] ?? null,
            ]
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
        $history = $this->foxlogger->getGpsHistory($imei, $date);

        return response()->json([
            'success' => true,
            'imei' => $imei,
            'date' => $date,
            'count' => count($history),
            'data' => $history,
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
