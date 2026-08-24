<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

use Illuminate\Support\Facades\Schedule;

// 1. Sinkronisasi Rutin Data GPS Armada Tiap Menit (Fallback/Auto-update)
Schedule::command('gps:sync-daily --days=1')
    ->everyMinute()
    ->timezone('Asia/Jakarta')
    ->withoutOverlapping()
    ->description('Sinkronisasi otomatis titik GPS aktif armada tiap menit ke database');

// 2. Sinkronisasi & Arsip Statistik AI Traffic NVR
Schedule::command('traffic:sync-daily')
    ->hourly()
    ->timezone('Asia/Jakarta')
    ->description('Sinkronisasi berkala akumulasi AI Traffic NVR per jam');

Schedule::command('traffic:sync-daily')
    ->dailyAt('23:55')
    ->timezone('Asia/Jakarta')
    ->description('Otomatis backup dan arsipkan statistik AI Traffic NVR hari ini ke database lokal');
