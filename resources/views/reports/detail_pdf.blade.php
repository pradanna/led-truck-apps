<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title ?? 'Laporan LED-FLX Fleet' }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #1e293b;
            margin: 20px;
            line-height: 1.5;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 18px;
        }
        .header-table td {
            vertical-align: middle;
        }
        .brand-title {
            font-size: 18px;
            font-weight: bold;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
        }
        .doc-title {
            font-size: 13px;
            font-weight: bold;
            color: #2563eb;
            margin-top: 4px;
        }
        .meta-info {
            text-align: right;
            font-size: 10px;
            color: #64748b;
        }
        .kpi-table {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: separate;
            border-spacing: 8px 0;
        }
        .kpi-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 12px;
            text-align: center;
        }
        .kpi-label {
            font-size: 9px;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .kpi-value {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a;
            margin-top: 4px;
        }
        .section-heading {
            font-size: 12px;
            font-weight: bold;
            color: #0f172a;
            margin-top: 15px;
            margin-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .data-table th {
            background-color: #f1f5f9;
            color: #475569;
            font-weight: bold;
            font-size: 9px;
            text-transform: uppercase;
            text-align: left;
            padding: 7px 9px;
            border: 1px solid #cbd5e1;
        }
        .data-table td {
            padding: 6px 9px;
            border: 1px solid #e2e8f0;
            font-size: 10px;
        }
        .data-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .badge-success {
            background-color: #dcfce7;
            color: #15803d;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
        }
        .badge-warning {
            background-color: #fef3c7;
            color: #b45309;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
        }
        .badge-danger {
            background-color: #ffe4e6;
            color: #be123c;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
        }
        .footer {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            font-size: 9px;
            color: #94a3b8;
            text-align: right;
        }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td style="width: 60%;">
                <div class="brand-title">YOUSEE LED TRUCK</div>
                <div class="doc-title">{{ $reportName ?? 'Laporan Operasional & Traffic' }}</div>
            </td>
            <td style="width: 40%;" class="meta-info">
                <div><strong>Periode:</strong> {{ $dateFrom }} s/d {{ $dateTo }}</div>
                <div><strong>Filter Armada:</strong> {{ $truckLabel ?? 'Semua Armada' }}</div>
                <div><strong>Dicetak pada:</strong> {{ $generatedAt ?? date('d F Y H:i') . ' WIB' }}</div>
            </td>
        </tr>
    </table>

    {{-- 1. TAB OVERVIEW / RINGKASAN --}}
    @if($tab === 'overview')
        <table class="kpi-table">
            <tr>
                <td style="width: 25%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Total Penayangan</div>
                        <div class="kpi-value">{{ number_format($summaryKPI['total_plays'] ?? 0, 0, ',', '.') }} Spot</div>
                    </div>
                </td>
                <td style="width: 25%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Durasi Tayang</div>
                        <div class="kpi-value">{{ $summaryKPI['total_play_hours'] ?? 0 }} Jam</div>
                    </div>
                </td>
                <td style="width: 25%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Jarak Tempuh Armada</div>
                        <div class="kpi-value">{{ $summaryKPI['total_distance_km'] ?? 0 }} KM</div>
                    </div>
                </td>
                <td style="width: 25%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Estimasi Audiens Reach</div>
                        <div class="kpi-value">{{ number_format($summaryKPI['total_traffic_reach'] ?? 0, 0, ',', '.') }}</div>
                    </div>
                </td>
            </tr>
        </table>

        <div class="section-heading">Ringkasan Performa Materi Kampanye</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 5%;">No</th>
                    <th style="width: 35%;">Nama Materi Iklan</th>
                    <th style="width: 25%;">Brand / Klien</th>
                    <th style="width: 15%;" class="text-center">Durasi</th>
                    <th style="width: 20%;" class="text-right">Status Penayangan</th>
                </tr>
            </thead>
            <tbody>
                @forelse($playlogData['topCampaigns'] ?? [] as $idx => $camp)
                    <tr>
                        <td class="text-center">{{ $idx + 1 }}</td>
                        <td class="font-bold">{{ $camp['name'] ?? '-' }}</td>
                        <td>{{ $camp['brand'] ?? '-' }}</td>
                        <td class="text-center">{{ $camp['duration'] ?? '30s' }}</td>
                        <td class="text-right">
                            <span class="badge-success">{{ $camp['status'] ?? 'Aktif' }}</span>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="text-center" style="color: #94a3b8; padding: 15px;">Belum ada data rekaman materi pada periode ini</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    @endif

    {{-- 2. TAB TRAFFIC --}}
    @if($tab === 'traffic')
        <table class="kpi-table">
            <tr>
                <td style="width: 20%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Sepeda Motor</div>
                        <div class="kpi-value">{{ number_format($trafficData['summary']['total_motorcycles'] ?? 0, 0, ',', '.') }}</div>
                    </div>
                </td>
                <td style="width: 20%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Mobil Pribadi</div>
                        <div class="kpi-value">{{ number_format($trafficData['summary']['total_cars'] ?? 0, 0, ',', '.') }}</div>
                    </div>
                </td>
                <td style="width: 20%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Pejalan Kaki</div>
                        <div class="kpi-value">{{ number_format($trafficData['summary']['total_pedestrians'] ?? 0, 0, ',', '.') }}</div>
                    </div>
                </td>
                <td style="width: 20%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Bus & Truk</div>
                        <div class="kpi-value">{{ number_format($trafficData['summary']['total_buses'] ?? 0, 0, ',', '.') }}</div>
                    </div>
                </td>
                <td style="width: 20%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Total Traffic</div>
                        <div class="kpi-value">{{ number_format($trafficData['summary']['grand_total_traffic'] ?? 0, 0, ',', '.') }}</div>
                    </div>
                </td>
            </tr>
        </table>

        <div class="section-heading">Distribusi Kepadatan Audiens per Jam (Peak Hours)</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 15%;">Jam Operasional</th>
                    <th style="width: 20%;" class="text-right">Sepeda Motor</th>
                    <th style="width: 20%;" class="text-right">Mobil</th>
                    <th style="width: 20%;" class="text-right">Pejalan Kaki</th>
                    <th style="width: 10%;" class="text-right">Bus / Truk</th>
                    <th style="width: 15%;" class="text-right">Total Akumulasi</th>
                </tr>
            </thead>
            <tbody>
                @forelse($trafficData['hourly'] ?? [] as $hr)
                    <tr>
                        <td class="font-bold">{{ $hr['time'] }} WIB</td>
                        <td class="text-right">{{ number_format($hr['motorcycles'] ?? 0, 0, ',', '.') }}</td>
                        <td class="text-right">{{ number_format($hr['cars'] ?? 0, 0, ',', '.') }}</td>
                        <td class="text-right">{{ number_format($hr['pedestrians'] ?? 0, 0, ',', '.') }}</td>
                        <td class="text-right">{{ number_format($hr['buses'] ?? 0, 0, ',', '.') }}</td>
                        <td class="text-right font-bold">{{ number_format($hr['total'] ?? 0, 0, ',', '.') }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="text-center" style="color: #94a3b8; padding: 15px;">Belum ada rekaman sensor lalu lintas pada periode ini</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    @endif

    {{-- 3. TAB PLAYLOG --}}
    @if($tab === 'playlog')
        <div class="section-heading">Riwayat Log Pemutaran Materi Iklan</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 5%;">No</th>
                    <th style="width: 20%;">Waktu Pemutaran</th>
                    <th style="width: 35%;">Materi Iklan / Kampanye</th>
                    <th style="width: 20%;">Klien / Keterangan</th>
                    <th style="width: 10%;" class="text-center">Durasi</th>
                    <th style="width: 10%;" class="text-right">Status</th>
                </tr>
            </thead>
            <tbody>
                @forelse($playlogData['records'] ?? [] as $idx => $rec)
                    <tr>
                        <td class="text-center">{{ $idx + 1 }}</td>
                        <td>{{ $rec['stempelWaktu'] ?? $rec['playTime'] ?? '-' }}</td>
                        <td class="font-bold">{{ $rec['materi'] ?? $rec['materialName'] ?? 'Materi Tayang' }}</td>
                        <td>{{ $rec['klien'] ?? '-' }}</td>
                        <td class="text-center">{{ $rec['durasi'] ?? 30 }}s</td>
                        <td class="text-right">
                            <span class="badge-success">{{ $rec['status'] ?? 'Sukses' }}</span>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="text-center" style="color: #94a3b8; padding: 15px;">Tidak ada riwayat penayangan pada periode ini</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    @endif

    {{-- 4. TAB GPS --}}
    @if($tab === 'gps')
        <table class="kpi-table">
            <tr>
                <td style="width: 25%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Total Jarak Tempuh</div>
                        <div class="kpi-value">{{ $summaryKPI['total_distance_km'] ?? 0 }} KM</div>
                    </div>
                </td>
                <td style="width: 25%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Kecepatan Rata-rata</div>
                        <div class="kpi-value">{{ $gpsData['stats']['avg_speed'] ?? '0 km/jam' }}</div>
                    </div>
                </td>
                <td style="width: 25%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Kecepatan Tertinggi</div>
                        <div class="kpi-value">{{ $gpsData['stats']['max_speed'] ?? '0 km/jam' }}</div>
                    </div>
                </td>
                <td style="width: 25%;">
                    <div class="kpi-card">
                        <div class="kpi-label">Status Pelacak GPS</div>
                        <div class="kpi-value">{{ $gpsData['stats']['idle_time'] ?? 'Aktif' }}</div>
                    </div>
                </td>
            </tr>
        </table>

        <div class="section-heading">Riwayat Checkpoint Perjalanan Armada (Interval 1 Menit)</div>
        @forelse($gpsData['groupedLogs'] ?? [] as $dayGroup)
            <div style="background-color: #f1f5f9; padding: 6px 10px; font-weight: bold; font-size: 11px; margin-top: 10px; border-left: 3px solid #2563eb; color: #1e293b;">
                Tanggal: {{ $dayGroup['formatted_date'] }} ({{ count($dayGroup['logs']) }} Checkpoint)
            </div>
            <table class="data-table" style="margin-top: 4px;">
                <thead>
                    <tr>
                        <th style="width: 5%;">No</th>
                        <th style="width: 15%;">Waktu</th>
                        <th style="width: 20%;">Armada</th>
                        <th style="width: 12%;">Kecepatan</th>
                        <th style="width: 33%;">Lokasi / Alamat</th>
                        <th style="width: 15%;" class="text-right">Status</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($dayGroup['logs'] as $lIdx => $log)
                        <tr>
                            <td class="text-center">{{ $lIdx + 1 }}</td>
                            <td class="font-bold">{{ $log['time'] }}</td>
                            <td>{{ $log['truck_name'] }}</td>
                            <td>{{ $log['speed'] }}</td>
                            <td>{{ $log['address'] }}</td>
                            <td class="text-right">
                                @if(!empty($log['is_moving']))
                                    <span class="badge-success">{{ $log['status'] }}</span>
                                @elseif(str_contains($log['status'], 'Mesin ON') || str_contains($log['status'], 'Standby'))
                                    <span class="badge-warning">{{ $log['status'] }}</span>
                                @else
                                    <span class="badge-danger">{{ $log['status'] }}</span>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @empty
            <table class="data-table">
                <tbody>
                    <tr>
                        <td class="text-center" style="color: #94a3b8; padding: 15px;">
                            Tidak ada riwayat pergerakan GPS pada rentang tanggal yang dipilih.
                        </td>
                    </tr>
                </tbody>
            </table>
        @endforelse
    @endif

    <div class="footer">
        Dokumen ini dibuat otomatis oleh Sistem Monitoring Yousee LED Truck • Rahasia & Hak Cipta Dilindungi
    </div>

</body>
</html>
