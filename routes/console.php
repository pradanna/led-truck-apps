<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

use Illuminate\Support\Facades\Schedule;

Schedule::command('gps:sync-daily --days=2')
    ->dailyAt('23:55')
    ->timezone('Asia/Jakarta')
    ->description('Otomatis backup dan arsipkan riwayat GPS Foxlogger hari ini ke database lokal');

Schedule::command('traffic:sync-daily')
    ->dailyAt('23:55')
    ->timezone('Asia/Jakarta')
    ->description('Otomatis backup dan arsipkan statistik AI Traffic NVR hari ini ke database lokal');

Schedule::command('gps:sync-daily --days=1')
    ->hourly()
    ->timezone('Asia/Jakarta')
    ->description('Sinkronisasi berkala titik GPS aktif harian');

Schedule::command('traffic:sync-daily')
    ->hourly()
    ->timezone('Asia/Jakarta')
    ->description('Sinkronisasi berkala akumulasi AI Traffic NVR harian');
