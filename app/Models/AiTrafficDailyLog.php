<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiTrafficDailyLog extends Model
{
    protected $fillable = [
        'truck_id',
        'truck_plate',
        'log_date',
        'motorcycles',
        'cars',
        'pedestrians',
        'buses_trucks',
        'total_traffic',
        'estimated_reach',
        'raw_metrics',
    ];

    protected $casts = [
        'log_date' => 'date',
        'motorcycles' => 'integer',
        'cars' => 'integer',
        'pedestrians' => 'integer',
        'buses_trucks' => 'integer',
        'total_traffic' => 'integer',
        'estimated_reach' => 'integer',
        'raw_metrics' => 'array',
    ];

    /**
     * Upsert traffic data for a truck on a given date only if active traffic detected (> 0)
     */
    public static function recordTraffic(string $truckId, string $date, array $metrics, ?string $truckPlate = null): ?self
    {
        $motor = (int)($metrics['motorcycles'] ?? 0);
        $cars = (int)($metrics['cars'] ?? 0);
        $peds = (int)($metrics['pedestrians'] ?? 0);
        $buses = (int)($metrics['buses_trucks'] ?? 0);
        $total = $motor + $cars + $peds + $buses;
        $detectionStatus = strtoupper(trim($metrics['detection_status'] ?? ''));

        // Jangan simpan jika perangkat offline / standby atau total deteksi traffic 0
        if ($total <= 0 || in_array($detectionStatus, ['DISCONNECTED', 'UNCONFIGURED', 'OFFLINE', 'STANDBY'])) {
            return null;
        }

        $reach = (int)($metrics['estimated_reach'] ?? round(($motor * 1.2) + ($cars * 1.8) + $peds));

        // Format plat nomor agar selalu <= 20 karakter (ambil dari tanda kurung jika format 'Truk LED 01 (B 9731 JXS)')
        $cleanPlate = $truckPlate ?? ($truckId === 'truck_2' ? 'B 9729 JXS' : 'B 9731 JXS');
        if (preg_match('/\(([^)]+)\)/', $cleanPlate, $matches)) {
            $cleanPlate = $matches[1];
        }
        $cleanPlate = mb_substr($cleanPlate, 0, 20);

        return self::updateOrCreate(
            [
                'truck_id' => $truckId,
                'log_date' => $date,
            ],
            [
                'truck_plate' => $cleanPlate,
                'motorcycles' => $motor,
                'cars' => $cars,
                'pedestrians' => $peds,
                'buses_trucks' => $buses,
                'total_traffic' => $total,
                'estimated_reach' => $reach,
                'raw_metrics' => $metrics,
            ]
        );
    }
}
