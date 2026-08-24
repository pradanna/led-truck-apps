<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

// 1. Cron Sync Cepat Otomatis Tiap Menit (Background Pull & DB Update)
Schedule::command('gps:sync-daily --days=1')
    ->everyMinute()
    ->timezone('Asia/Jakarta')
    ->withoutOverlapping()
    ->description('Sinkronisasi otomatis titik GPS aktif armada tiap menit ke database');

// 2. Backup & Arsip Harian Pukul 23:55
Schedule::command('gps:sync-daily --days=2')
    ->dailyAt('23:55')
    ->timezone('Asia/Jakarta')
    ->description('Otomatis backup dan arsipkan riwayat GPS Foxlogger hari ini ke database lokal');

Schedule::command('traffic:sync-daily')
    ->dailyAt('23:55')
    ->timezone('Asia/Jakarta')
    ->description('Otomatis backup dan arsipkan statistik AI Traffic NVR hari ini ke database lokal');

Schedule::command('traffic:sync-daily')
    ->hourly()
    ->timezone('Asia/Jakarta')
    ->description('Sinkronisasi berkala akumulasi AI Traffic NVR harian');
