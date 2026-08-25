<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VnnoxPlaylogLog extends Model
{
    protected $fillable = [
        'truck_id',
        'log_date',
        'media_name',
        'client_name',
        'play_time',
        'duration',
        'status',
        'info_system',
    ];

    protected $casts = [
        'log_date' => 'date',
        'duration' => 'integer',
    ];

    /**
     * Record or update a single playlog entry idempotently
     */
    public static function recordLog(string $truckId, string $logDate, array $record): self
    {
        return self::updateOrCreate(
            [
                'truck_id'   => $truckId,
                'log_date'   => $logDate,
                'media_name' => $record['materi'] ?? 'Materi Iklan',
                'play_time'  => $record['stempelWaktu'] ?? (date('H:i:s') . ' WIB'),
            ],
            [
                'client_name' => $record['klien'] ?? 'Klien',
                'duration'    => (int) ($record['durasi'] ?? 30),
                'status'      => $record['status'] ?? 'Success',
                'info_system' => $record['infoSistem'] ?? null,
            ]
        );
    }
}
