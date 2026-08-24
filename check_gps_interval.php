<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\GpsTelemetryLog;

$today = date('Y-m-d');
$imei1 = '0356153590691330'; // Truk 01
$imei2 = '0866833070213829'; // Truk 02

foreach ([$imei1, $imei2] as $imei) {
    $logs = GpsTelemetryLog::where('imei', $imei)
        ->whereDate('logged_at', $today)
        ->orderBy('logged_at', 'asc')
        ->get(['logged_at', 'speed', 'status']);

    echo "\n=== IMEI: {$imei} | Tanggal: {$today} ===\n";
    echo "Total titik di DB hari ini: " . $logs->count() . " baris\n\n";

    if ($logs->count() === 0) {
        echo "(Tidak ada data hari ini untuk IMEI ini)\n";
        continue;
    }

    // Hitung gap interval
    $gaps = [];
    $prev = null;
    foreach ($logs as $log) {
        if ($prev) {
            $gaps[] = abs(strtotime($log->logged_at) - strtotime($prev->logged_at));
        }
        $prev = $log;
    }

    if (!empty($gaps)) {
        echo "Gap interval antar titik:\n";
        echo "  Min: " . min($gaps) . " detik\n";
        echo "  Max: " . max($gaps) . " detik\n";
        echo "  Rata-rata: " . round(array_sum($gaps) / count($gaps)) . " detik\n";
    }

    // Show first 5 and last 5
    echo "\nData awal (5 titik pertama):\n";
    foreach ($logs->take(5) as $l) {
        echo "  " . $l->logged_at . " | " . $l->speed . " km/h | " . $l->status . "\n";
    }
    echo "Data akhir (5 titik terakhir):\n";
    foreach ($logs->reverse()->take(5)->reverse() as $l) {
        echo "  " . $l->logged_at . " | " . $l->speed . " km/h | " . $l->status . "\n";
    }
}

// Cek raw_count jika bisa (simulasikan downsampling)
echo "\n\n=== SIMULASI DOWNSAMPLING ===\n";
$history = GpsTelemetryLog::where('imei', $imei1)
    ->whereDate('logged_at', $today)
    ->orderBy('logged_at', 'asc')
    ->get(['logged_at', 'latitude', 'longitude', 'speed']);

$sampled60 = 0; // 1 menit
$sampled300 = 0; // 5 menit
$lastTime60 = 0;
$lastTime300 = 0;

foreach ($history as $pt) {
    $t = strtotime($pt->logged_at);
    if ($lastTime60 === 0 || abs($t - $lastTime60) >= 60) {
        $sampled60++;
        $lastTime60 = $t;
    }
    if ($lastTime300 === 0 || abs($t - $lastTime300) >= 300) {
        $sampled300++;
        $lastTime300 = $t;
    }
}

echo "IMEI Truk 01 - Data hari ini:\n";
echo "  Raw (semua titik dari DB): " . $history->count() . " titik\n";
echo "  Setelah downsampling 1 menit: {$sampled60} titik\n";
echo "  Setelah downsampling 5 menit: {$sampled300} titik\n";
