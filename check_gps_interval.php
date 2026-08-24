<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\GpsTelemetryLog;

$logs = GpsTelemetryLog::orderBy('logged_at', 'desc')->limit(20)->get(['imei', 'logged_at', 'speed', 'status']);

if ($logs->count() === 0) {
    echo "Belum ada data di tabel gps_telemetry_logs.\n";
    exit;
}

echo "=== 20 Data GPS Terbaru di Database Lokal ===\n";
echo str_pad("IMEI", 20) . " | " . str_pad("Waktu Log", 20) . " | " . str_pad("Speed", 8) . " | Status\n";
echo str_repeat("-", 70) . "\n";

$prev = null;
foreach ($logs as $log) {
    $diff = '';
    if ($prev) {
        $diffSec = abs(strtotime($log->logged_at) - strtotime($prev->logged_at));
        $diff = " [{$diffSec}s gap]";
    }
    echo str_pad(substr($log->imei, -8), 20) . " | " . str_pad($log->logged_at, 20) . " | " . str_pad($log->speed . ' km/h', 8) . " | " . $log->status . $diff . "\n";
    $prev = $log;
}
echo "\nTotal data di DB: " . GpsTelemetryLog::count() . " baris\n";
