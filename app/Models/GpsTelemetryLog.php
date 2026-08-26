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
     * Batch save / insert Foxlogger API points to database (Only inserts new points not yet existing)
     */
    public static function bulkSyncFromFoxlogger(string $imei, array $points, ?string $truckPlate = null): int
    {
        if (empty($points)) return 0;

        // 1. Extract valid timestamps
        $parsedPoints = [];
        $timeList = [];

        foreach ($points as $pt) {
            $timeStr = $pt['time'] ?? $pt['last_upd'] ?? $pt['last_time'] ?? null;
            if (!$timeStr) continue;

            $loggedAt = date('Y-m-d H:i:s', strtotime($timeStr));
            $parsedPoints[$loggedAt] = $pt;
            $timeList[] = $loggedAt;
        }

        if (empty($parsedPoints)) return 0;

        // 2. Query already existing timestamps in database for this IMEI
        $existingTimes = self::where('imei', $imei)
            ->whereIn('logged_at', $timeList)
            ->pluck('logged_at')
            ->map(fn($t) => is_string($t) ? $t : $t->format('Y-m-d H:i:s'))
            ->flip()
            ->toArray();

        // 3. Only insert newly discovered points
        $newRecords = [];
        $now = now()->toDateTimeString();

        foreach ($parsedPoints as $loggedAt => $pt) {
            if (isset($existingTimes[$loggedAt])) {
                continue; // Skip already archived data
            }

            $logDate = substr($loggedAt, 0, 10);
            $lat = (float)($pt['lat'] ?? $pt['latitude'] ?? $pt['lo_lat'] ?? $pt['last_latitude'] ?? 0);
            $lng = (float)($pt['long'] ?? $pt['longitude'] ?? $pt['lo_long'] ?? $pt['last_longitude'] ?? 0);
            $speed = (float)($pt['Speed'] ?? $pt['speed'] ?? $pt['last_speed'] ?? 0);
            $rawStatus = strtoupper(trim($pt['status'] ?? $pt['movement_status'] ?? 'OFF'));
            $rawEngine = strtoupper(trim($pt['engi'] ?? ((isset($pt['last_engine']) && $pt['last_engine'] == 1) ? 'ON' : 'OFF')));
            $mileage = (float)($pt['Mill'] ?? $pt['mileage'] ?? 0);
            $address = $pt['addr'] ?? $pt['address'] ?? $pt['last_address'] ?? null;

            $newRecords[] = [
                'imei' => $imei,
                'truck_plate' => $truckPlate ?? ($pt['unit'] ?? $pt['gps_name'] ?? null),
                'log_date' => $logDate,
                'logged_at' => $loggedAt,
                'latitude' => $lat,
                'longitude' => $lng,
                'speed' => $speed,
                'status' => $rawStatus,
                'engine_status' => $rawEngine,
                'mileage_km' => $mileage > 0 ? $mileage : null,
                'address' => $address,
                'raw_payload' => json_encode($pt),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (!empty($newRecords)) {
            // Batch insert in chunks of 200 for maximum database performance
            foreach (array_chunk($newRecords, 200) as $chunk) {
                self::insert($chunk);
            }
        }

        return count($newRecords);
    }
}
