<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GpsTelemetryLog extends Model
{
    protected $fillable = [
        'imei',
        'truck_plate',
        'logged_at',
        'log_date',
        'latitude',
        'longitude',
        'speed',
        'status',
        'engine_status',
        'mileage_km',
        'address',
        'raw_payload',
    ];

    protected $casts = [
        'logged_at' => 'datetime',
        'log_date' => 'date',
        'latitude' => 'float',
        'longitude' => 'float',
        'speed' => 'float',
        'mileage_km' => 'float',
        'raw_payload' => 'array',
    ];

    /**
     * Batch save / upsert Foxlogger API points to database
     */
    public static function bulkSyncFromFoxlogger(string $imei, array $points, ?string $truckPlate = null): int
    {
        if (empty($points)) return 0;

        $insertedCount = 0;
        foreach ($points as $pt) {
            $timeStr = $pt['time'] ?? $pt['last_upd'] ?? $pt['last_time'] ?? null;
            if (!$timeStr) continue;

            $loggedAt = date('Y-m-d H:i:s', strtotime($timeStr));
            $logDate = date('Y-m-d', strtotime($timeStr));

            $lat = (float)($pt['lat'] ?? $pt['latitude'] ?? $pt['lo_lat'] ?? $pt['last_latitude'] ?? 0);
            $lng = (float)($pt['long'] ?? $pt['longitude'] ?? $pt['lo_long'] ?? $pt['last_longitude'] ?? 0);
            $speed = (float)($pt['Speed'] ?? $pt['speed'] ?? $pt['last_speed'] ?? 0);
            $rawStatus = strtoupper(trim($pt['status'] ?? $pt['movement_status'] ?? 'OFF'));
            $rawEngine = strtoupper(trim($pt['engi'] ?? ($pt['last_engine'] == 1 ? 'ON' : 'OFF')));
            $mileage = (float)($pt['Mill'] ?? $pt['mileage'] ?? 0);
            $address = $pt['addr'] ?? $pt['address'] ?? $pt['last_address'] ?? null;

            self::updateOrCreate(
                [
                    'imei' => $imei,
                    'logged_at' => $loggedAt,
                ],
                [
                    'truck_plate' => $truckPlate ?? ($pt['unit'] ?? $pt['gps_name'] ?? null),
                    'log_date' => $logDate,
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'speed' => $speed,
                    'status' => $rawStatus,
                    'engine_status' => $rawEngine,
                    'mileage_km' => $mileage > 0 ? $mileage : null,
                    'address' => $address,
                    'raw_payload' => $pt,
                ]
            );
            $insertedCount++;
        }

        return $insertedCount;
    }
}
