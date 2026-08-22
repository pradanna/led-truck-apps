import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
  LayoutDashboard,
  Truck,
  Tv,
  Clock,
  Eye,
  Video,
  Navigation,
  MapPin,
  ListMusic,
  BarChart3,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Activity,
  Calendar,
  Radio,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Layers,
  FileText
} from 'lucide-react';
import AppLayout from '../Layouts/AppLayout';

export default function Dashboard({
  gpsDevices = [],
  gpsPositions = [],
  novastarData = {},
  cctvData = {}
}) {
  // 1. Truck Selector State: 'truck_1' or 'truck_2'
  const [selectedTruckId, setSelectedTruckId] = useState('truck_1');

  // Map GPS data
  const gpsTruck1 = gpsPositions.find(p => p.unit?.includes('9731') || p.imei === '0356153590691330') || gpsPositions[0] || {};
  const gpsTruck2 = gpsPositions.find(p => p.unit?.includes('9142') || p.imei !== '0356153590691330') || gpsPositions[1] || gpsPositions[0] || {};
  const currentGps = selectedTruckId === 'truck_1' ? gpsTruck1 : gpsTruck2;

  // Map Novastar / VNNOX data
  const playlistItems = novastarData?.playlist?.items || [];
  const controllerStatus = novastarData?.controller || {};
  const playlogRecords = novastarData?.playlogs?.records || [];

  // Active playing material directly from Novastar API
  const activeMaterial = playlistItems.find(item => item.status === 'PLAYING') || playlistItems[0] || null;

  // Map CCTV & AI Traffic data directly from Holowits API
  const truckCctv = selectedTruckId === 'truck_1' ? cctvData?.truck_1 : cctvData?.truck_2;
  const traffic = truckCctv?.traffic || {
    motorcycles: 0,
    cars: 0,
    pedestrians: 0,
    buses_trucks: 0,
    density: 'OFFLINE',
    average_speed_kmh: 0,
    estimated_reach: 0,
  };

  const truckName = selectedTruckId === 'truck_1' ? 'Truk LED 01 (B 9731 JXS)' : 'Truk LED 02 (B 9142 SXZ)';
  const truckPlate = selectedTruckId === 'truck_1' ? 'B 9731 JXS' : 'B 9142 SXZ';

  const isGpsOnline = !!(currentGps.unit || currentGps.imei);
  const isGpsMoving = (currentGps.Speed || currentGps.last_speed || 0) > 0 || currentGps.status === 'MOVE';
  const isLedOnline = controllerStatus.onlineStatus ?? false;

  return (
    <AppLayout
      activeMenu="dashboard"
      title="Dashboard Overview"
      subtitle="Ringkasan eksekutif armada, videotron, rute GPS, dan laporan trafik harian."
      statusBadge={
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          MULTI-API REALTIME DATA
        </span>
      }
    >
      <Head title="Dashboard Overview - LED-FLX Fleet Control" />

      {/* 1. TRUCK SELECTOR BAR (LIGHT MODE) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" />
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            Pilih Armada Truk:
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setSelectedTruckId('truck_1')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              selectedTruckId === 'truck_1'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${cctvData?.truck_1?.online ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            Truk LED 01 (B 9731 JXS)
          </button>

          <button
            onClick={() => setSelectedTruckId('truck_2')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              selectedTruckId === 'truck_2'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${cctvData?.truck_2?.online ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            Truk LED 02 (B 9142 SXZ)
          </button>
        </div>
      </div>

      {/* 2. TOP 4 EXECUTIVE OVERVIEW METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: STATUS KENDARAAN (DARI FOXLOGGER GPS) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Status Kendaraan
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-slate-900 truncate">
              {currentGps.unit || truckPlate}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`w-2 h-2 rounded-full ${isGpsMoving ? 'bg-emerald-500 animate-pulse' : (isGpsOnline ? 'bg-amber-500' : 'bg-slate-400')}`}></span>
              <span className="text-xs font-bold text-slate-700">
                {isGpsMoving ? `Bergerak (${currentGps.Speed || currentGps.last_speed || 0} km/j)` : (isGpsOnline ? 'Parkir / Mesin Mati' : 'GPS Offline')}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Foxlogger GPS API
            </div>
          </div>
        </div>

        {/* CARD 2: STATUS LED SCREEN (DARI NOVASTAR / VNNOX) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Status Layar LED
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-slate-900">
              {isLedOnline ? 'AKTIF (PLAYING)' : 'STANDBY / OFFLINE'}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{controllerStatus.processorChip || 'NovaStar TU20Pro'}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              NovaCloud VNNOX API
            </div>
          </div>
        </div>

        {/* CARD 3: DURASI TAYANG (DARI NOVASTAR / VNNOX) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Durasi Tayang Hari Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-slate-900 font-mono">
              {isLedOnline ? `${playlistItems.length * 30} Detik / Loop` : '0 Jam 00 Menit'}
            </div>
            <div className="text-xs text-amber-700 font-bold mt-1.5">
              {isLedOnline ? `${playlistItems.length} Materi Aktif Terjadwal` : 'Videotron Standby'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              NovaStar TU20Pro Sync
            </div>
          </div>
        </div>

        {/* CARD 4: ESTIMASI JANGKAUAN AUDIENS (DARI HOLOWITS CCTV) */}
        <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">
              Estimasi Jangkauan Audiens
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-900 font-mono">
              {Number(traffic.estimated_reach || 0).toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-blue-700 font-bold mt-1.5">
              {truckCctv?.online ? 'Impresi Lalu Lintas Rute' : (truckCctv?.status_message || 'NVR Belum Terhubung')}
            </div>
            <div className="text-[10px] text-blue-500 mt-1 font-mono">
              HOLOWITS AI Vision Counter
            </div>
          </div>
        </div>
      </div>

      {/* 3. DUA KOLOM SECTION UTAMA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI (2 COLS): MATERI SEDANG TAYANG + POSISI TRUK TERKINI */}
        <div className="lg:col-span-2 space-y-6">
          {/* A. MATERI SEDANG TAYANG (DARI NOVASTAR / VNNOX) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Materi Sedang Tayang di Layar LED</h3>
              </div>
              <Link
                href="/playlog"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
              >
                Kelola Playlist <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {activeMaterial ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold shrink-0">
                    VIDEOTRON
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-blue-600 uppercase">
                      {activeMaterial.id} · {activeMaterial.duration || 30} Detik
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {activeMaterial.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeMaterial.client || 'Klien Materi Iklan'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    LIVE ON SCREEN
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-700">Tidak Ada Materi Sedang Tayang</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {novastarData?.playlist?.message || 'Kredensial VNNOX API belum terhubung atau playlist kosong.'}
                </p>
              </div>
            )}
          </div>

          {/* B. POSISI TRUK TERKINI (DARI FOXLOGGER GPS) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Posisi & Rute Truk Terkini</h3>
              </div>
              <Link
                href="/gps-tracking"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
              >
                Buka Peta GPS Penuh <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isGpsOnline ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div>
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Alamat / Lokasi Geografis Terdeteksi:
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 leading-relaxed">
                    {currentGps.address || 'Posisi koordinat sedang diupdate...'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">KECEPATAN</span>
                    <span className="font-mono font-black text-emerald-600 text-sm">
                      {currentGps.Speed || currentGps.last_speed || 0} km/j
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">STATUS MESIN</span>
                    <span className="font-bold text-slate-800">
                      {isGpsMoving ? 'ACTIVE / ON' : 'IDLE / OFF'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">UPDATE TERAKHIR</span>
                    <span className="font-mono text-slate-700">
                      {currentGps.last_upd || currentGps.last_time || '-'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-700">Data GPS Tidak Ditemukan</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Device GPS Foxlogger belum aktif atau token otentikasi perlu diperbarui.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN (1 COL): LOG PENAYANGAN + LAPORAN TRAFIK HARIAN */}
        <div className="space-y-6">
          {/* C. LOG PENAYANGAN TERBARU */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Log Penayangan</h3>
              </div>
              <Link
                href="/playlog"
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Semua Log
              </Link>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {playlogRecords.length > 0 ? (
                playlogRecords.slice(0, 4).map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-[170px]">
                      <div className="font-bold text-slate-900 truncate">{log.materi}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{log.stempelWaktu}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Success
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  Belum ada catatan log penayangan dari NovaStar API.
                </div>
              )}
            </div>
          </div>

          {/* D. LAPORAN TRAFIK HARIAN (DENGAN TOMBOL LIHAT LAPORAN DETAIL) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Laporan Trafik Harian</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                <div className="text-[10px] font-extrabold text-amber-700 uppercase">Sepeda Motor</div>
                <div className="text-lg font-black text-amber-800 font-mono mt-0.5">
                  {traffic.motorcycles || 0}
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                <div className="text-[10px] font-extrabold text-blue-700 uppercase">Mobil Pribadi</div>
                <div className="text-lg font-black text-blue-800 font-mono mt-0.5">
                  {traffic.cars || 0}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <div className="text-[10px] font-extrabold text-emerald-700 uppercase">Pejalan Kaki</div>
                <div className="text-lg font-black text-emerald-800 font-mono mt-0.5">
                  {traffic.pedestrians || 0}
                </div>
              </div>

              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl">
                <div className="text-[10px] font-extrabold text-purple-700 uppercase">Bus & Truk</div>
                <div className="text-lg font-black text-purple-800 font-mono mt-0.5">
                  {traffic.buses_trucks || 0}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/cctv-monitoring"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-600/30"
              >
                <FileText className="w-4 h-4" />
                <span>Lihat Laporan Detail</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
