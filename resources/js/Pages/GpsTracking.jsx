import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Radio, Truck, Tv, Clock, Eye, Video, MapPin, Play, Pause, RotateCcw, SkipForward,
  BarChart3, Camera, FileText, ChevronRight, CheckCircle2, RefreshCw, X, Navigation, Signal, Wifi, Activity, Calendar, AlertCircle, FileSpreadsheet, Download
} from 'lucide-react';
import Sidebar from '../Components/Sidebar';
import Navbar from '../Components/Navbar';

// Custom Leaflet Truck Icon
const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19],
});

// Helper to fly map smooth to selected lat/lng with close zoom
function MapFlyTo({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (map && lat && lng) {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
      map.flyTo([lat, lng], 16, {
        animate: true,
        duration: 1.2
      });
    }
  }, [lat, lng, map]);
  return null;
}

export default function GpsTracking({ realDevices = [], realPositions = [] }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [currentLivePositions, setCurrentLivePositions] = useState(realPositions);
  const [currentLiveDevices, setCurrentLiveDevices] = useState(realDevices);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Deduplicate and build standard fleet list
  const fleetList = useMemo(() => {
    const list = [];
    const seenImeis = new Set();

    const addTruck = (t) => {
      if (t && t.imei && !seenImeis.has(t.imei)) {
        seenImeis.add(t.imei);
        list.push(t);
      }
    };

    const formatTruckDisplayName = (unit, imei, defaultFallback) => {
      const u = (unit || '').toUpperCase();
      if (u.includes('9731') || imei === '0356153590691330') {
        return 'Truk 01 (B 9731 JXS)';
      }
      if (u.includes('9729') || u.includes('9142') || imei === '0866833070213829') {
        return 'Truk 02 (B 9729 JXS)';
      }
      return defaultFallback || unit || 'Truk LED';
    };

    if (currentLivePositions.length > 0) {
      currentLivePositions.forEach(pos => {
        const displayName = formatTruckDisplayName(pos.unit, pos.imei, 'Truk LED');
        addTruck({
          id: pos.imei,
          name: `${displayName} (${pos.imei})`,
          gpsName: displayName,
          speed: pos.Speed || pos.last_speed || 0,
          address: pos.address || 'Posisi GPS Armada',
          lat: parseFloat(pos.lo_lat || pos.last_latitude) || -6.315447,
          lng: parseFloat(pos.lo_long || pos.last_longitude) || 106.634666,
          status: pos.status === 'MOVE' ? 'Berkendara (LIVE)' : 'Berhenti (OFF)',
          lastTime: pos.last_upd || 'Terbaru',
          driver: pos.drv || 'Driver Operasional',
          engine: pos.engi || (pos.status === 'MOVE' ? 'ON' : 'OFF'),
          imei: pos.imei
        });
      });
    }

    if (currentLiveDevices.length > 0) {
      currentLiveDevices.forEach(dev => {
        const displayName = formatTruckDisplayName(dev.gps_name, dev.imei, 'Truk LED');
        addTruck({
          id: dev.imei,
          name: `${displayName} (${dev.tracker_type || 'GPS'})`,
          gpsName: displayName,
          speed: dev.last_speed || 0,
          address: dev.last_address || 'BSD City, Tangerang',
          lat: parseFloat(dev.last_latitude) || -6.315447,
          lng: parseFloat(dev.last_longitude) || 106.634666,
          status: dev.movement_status === 'OFF' ? 'Berhenti (OFF)' : 'Berkendara (LIVE)',
          lastTime: dev.last_time || 'Terbaru',
          driver: dev.driver_name || 'Driver Operasional',
          engine: dev.last_engine === 1 ? 'ON' : 'OFF',
          imei: dev.imei
        });
      });
    }

    if (list.length === 0) {
      list.push(
        { id: '0356153590691330', name: 'Truk 01 (B 9731 JXS)', gpsName: 'Truk 01 (B 9731 JXS)', speed: 0, address: 'BSD City, Tangerang', lat: -6.25245, lng: 106.61932, status: 'Berhenti (OFF)', lastTime: 'Terbaru', driver: 'Driver Operasional', engine: 'OFF', imei: '0356153590691330' },
        { id: '0866833070213829', name: 'Truk 02 (B 9729 JXS)', gpsName: 'Truk 02 (B 9729 JXS)', speed: 0, address: 'Gading Serpong, Tangerang', lat: -6.25205, lng: 106.619385, status: 'Berhenti (OFF)', lastTime: 'Terbaru', driver: 'Driver Operasional', engine: 'OFF', imei: '0866833070213829' }
      );
    }

    return list;
  }, [currentLivePositions, currentLiveDevices]);

  const [selectedTruckId, setSelectedTruckId] = useState(fleetList[0]?.id || '');
  const activeTruck = fleetList.find(t => String(t.id) === String(selectedTruckId)) || fleetList[0];

  const [rawHistoryPoints, setRawHistoryPoints] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Reset selected checkpoint when truck or date changes
  useEffect(() => {
    setSelectedCheckpoint(null);
  }, [selectedTruckId, selectedDate]);

  // Fetch History Points based on selected Date & Truck IMEI with AbortController
  useEffect(() => {
    if (activeTruck && activeTruck.imei) {
      const controller = new AbortController();
      setIsLoadingHistory(true);

      fetch(`/api/gps-history/${activeTruck.imei}?date=${selectedDate}&refresh=1&_t=${Date.now()}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            const formatted = data.data.map((pt, index) => ({
              id: index + 1,
              lat: parseFloat(pt.lat || pt.latitude),
              lng: parseFloat(pt.long || pt.longitude),
              speed: pt.Speed !== undefined ? pt.Speed : (pt.speed !== undefined ? pt.speed : 0),
              time: pt.time || pt.last_upd || pt.logged_at || '',
              address: pt.addr || pt.address || 'Posisi Rute Armada'
            })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));

            const uniquePoints = [];
            formatted.forEach((pt) => {
              if (uniquePoints.length === 0) {
                uniquePoints.push(pt);
              } else {
                const prev = uniquePoints[uniquePoints.length - 1];
                const isSameAddress = pt.address && prev.address && pt.address.trim() === prev.address.trim();
                const isSameCoord = Math.abs(pt.lat - prev.lat) < 0.0001 && Math.abs(pt.lng - prev.lng) < 0.0001;
                
                if (!isSameAddress && !isSameCoord) {
                  uniquePoints.push(pt);
                }
              }
            });

            uniquePoints.reverse();
            setRawHistoryPoints(uniquePoints);
          } else {
            setRawHistoryPoints([]);
          }
        })
        .catch(() => {
          setRawHistoryPoints([]);
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });

      return () => controller.abort();
    }
  }, [activeTruck?.imei, selectedDate, refreshTrigger]);

  // Force Live Sync directly from Foxlogger API
  const handleLiveRefresh = async () => {
    setIsSyncing(true);
    setSyncMessage('Menyinkronkan data GPS langsung dari server Foxlogger...');

    try {
      const res = await fetch(`/api/gps-live-sync?_t=${Date.now()}`);
      const data = await res.json();

      if (data.success) {
        if (data.positions && data.positions.length > 0) {
          setCurrentLivePositions(data.positions);
        }
        if (data.devices && data.devices.length > 0) {
          setCurrentLiveDevices(data.devices);
        }
        // Reset selected checkpoint so map focuses on newest point
        setSelectedCheckpoint(null);
        // Trigger history reload with cache bypass
        setRefreshTrigger(Date.now());
        setSyncMessage(`Berhasil diperbarui pukul ${data.synced_at || 'sekarang'}`);
        setTimeout(() => setSyncMessage(''), 3500);
      } else {
        setSyncMessage('Gagal menyinkronkan data GPS');
        setTimeout(() => setSyncMessage(''), 3000);
      }
    } catch (err) {
      setSyncMessage('Terjadi kendala saat menyinkronkan data GPS');
      setTimeout(() => setSyncMessage(''), 3000);
    } finally {
      setIsSyncing(false);
    }
  };


  // Filter history points to 1-minute sampling intervals for clean display
  const realHistoryPoints = useMemo(() => {
    if (rawHistoryPoints.length === 0) return [];
    
    const sampled = [];
    let lastTimeMs = null;

    const chronological = [...rawHistoryPoints].reverse();
    
    chronological.forEach((pt) => {
      const timeStr = pt.time ? pt.time.replace(' ', 'T') : '';
      const currentMs = new Date(timeStr).getTime();
      
      if (!lastTimeMs || isNaN(currentMs) || Math.abs(currentMs - lastTimeMs) >= 1 * 60 * 1000) {
        sampled.push(pt);
        if (!isNaN(currentMs)) {
          lastTimeMs = currentMs;
        }
      }
    });

    return sampled.reverse();
  }, [rawHistoryPoints]);

  const isSelectedDateToday = selectedDate === todayStr;
  
  const currentPoint = useMemo(() => {
    if (selectedCheckpoint) {
      return selectedCheckpoint;
    }
    if (realHistoryPoints.length > 0) {
      return realHistoryPoints[0];
    }
    if (isSelectedDateToday) {
      return {
        lat: activeTruck.lat,
        lng: activeTruck.lng,
        address: activeTruck.address,
        speed: activeTruck.speed,
        time: activeTruck.lastTime,
      };
    }
    return null;
  }, [selectedCheckpoint, realHistoryPoints, activeTruck, isSelectedDateToday]);

  const displayLat = currentPoint ? currentPoint.lat : activeTruck.lat;
  const displayLng = currentPoint ? currentPoint.lng : activeTruck.lng;
  const displayAddress = currentPoint ? (currentPoint.address || activeTruck.address) : `Tidak ada data GPS pada ${selectedDate}`;
  const displaySpeed = currentPoint ? currentPoint.speed : 0;
  const displayTime = currentPoint ? currentPoint.time : `-`;

  const polylinePositions = useMemo(() => {
    if (realHistoryPoints.length > 0) {
      return [...realHistoryPoints].reverse().map(pt => [pt.lat, pt.lng]);
    }
    if (isSelectedDateToday) {
      return [[activeTruck.lat, activeTruck.lng]];
    }
    return [];
  }, [realHistoryPoints, activeTruck, isSelectedDateToday]);



  return (
    <>
      <Head title={`GPS Tracking Armada - LED-FLX Fleet Control`} />

      <div className="flex h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden">
        {/* Unified Sidebar Layout */}
        <Sidebar activeMenu="gps" />

        {/* Main Content Body */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* UNIFIED TOP NAVBAR */}
          <Navbar 
            title="Peta GPS Armada" 
            subtitle="Monitoring lokasi real-time dan histori rute armada GPS Foxlogger."
            statusBadge={
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE GPS ACTIVE
              </span>
            }
          />

          {/* MAIN SCROLLABLE BODY */}
          <main className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* PAGE FILTERING & EXPORT CONTROLS */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Date Picker Filter */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs text-slate-700">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-slate-500 uppercase font-bold text-[10px]">Filter Tanggal:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer text-xs font-mono"
                  />
                </div>

                {/* Truck Selector Tabs */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-1 flex items-center gap-1.5">
                  {fleetList.map((truck, idx) => {
                    const isSelected = String(truck.id) === String(selectedTruckId);
                    const defaultName = idx === 0 ? 'Truk 01 (B 9731 JXS)' : 'Truk 02 (B 9729 JXS)';
                    const tabTitle = truck.gpsName || defaultName;

                    return (
                      <button
                        key={truck.id}
                        type="button"
                        onClick={() => setSelectedTruckId(truck.id)}
                        className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${truck.status?.includes('LIVE') || truck.engine === 'ON' ? 'bg-emerald-400' : isSelected ? 'bg-blue-200' : 'bg-slate-400'}`}></span>
                        {tabTitle}
                      </button>
                    );
                  })}
                </div>

                {!isSelectedDateToday && (
                  <button
                    onClick={() => setSelectedDate(todayStr)}
                    className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors shadow-xs"
                  >
                    Reset Hari Ini
                  </button>
                )}
              </div>

              {/* REFRESH ACTION BUTTON */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleLiveRefresh}
                  disabled={isSyncing}
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Ambil data posisi & riwayat GPS paling mutakhir langsung dari Foxlogger"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-white ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Refresh GPS'}</span>
                </button>
              </div>
            </div>

            {/* Sync Notification Banner */}
            {syncMessage && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                syncMessage.includes('Berhasil') 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : syncMessage.includes('Gagal') || syncMessage.includes('kendala')
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                <div className="flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="font-semibold">{syncMessage}</span>
                </div>
                {!isSyncing && (
                  <button onClick={() => setSyncMessage('')} className="text-slate-400 hover:text-slate-600 font-bold text-xs">
                    Tutup
                  </button>
                )}
              </div>
            )}

            {/* GPS TRACKING REAL MAP */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Col (2 Span): Real Map Display */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-slate-900 text-base">Peta Rute GPS - Tanggal {selectedDate}</h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      {isLoadingHistory ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1.5 font-bold">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memuat Data {selectedDate}...
                        </span>
                      ) : realHistoryPoints.length > 0 ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> GPS Aktif ({realHistoryPoints.length} Titik / 1m Sampling)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 flex items-center gap-1.5 font-bold">
                          <AlertCircle className="w-3.5 h-3.5 text-slate-500" /> Tidak Ada Pergerakan ({selectedDate})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Real Leaflet Map Container */}
                  <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-slate-200 z-10 shadow-inner">
                    <MapContainer
                      center={[displayLat, displayLng]}
                      zoom={14}
                      scrollWheelZoom={true}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <MapFlyTo lat={displayLat} lng={displayLng} />
                      
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      />

                      {polylinePositions.length > 1 && (
                        <Polyline
                          positions={polylinePositions}
                          color="#dc2626"
                          weight={5}
                          opacity={0.9}
                        />
                      )}

                      {/* Interactive Checkpoint Markers */}
                      {realHistoryPoints.map((pt) => {
                        const isFocused = selectedCheckpoint?.id === pt.id;
                        return (
                          <CircleMarker
                            key={pt.id}
                            center={[pt.lat, pt.lng]}
                            radius={isFocused ? 10 : 6}
                            pathOptions={{
                              fillColor: isFocused ? '#2563eb' : '#dc2626',
                              color: '#ffffff',
                              weight: isFocused ? 3 : 2,
                              fillOpacity: 0.95
                            }}
                            eventHandlers={{
                              click: () => setSelectedCheckpoint(pt)
                            }}
                          >
                            <Popup defaultOpen={isFocused}>
                              <div className="text-xs p-1 text-slate-900 font-sans">
                                <strong className="text-blue-600">Checkpoint Jam {pt.time?.split(' ')[1] || pt.time}</strong><br />
                                <span className="font-mono text-slate-500">Truk: {activeTruck.gpsName}</span><br />
                                Kecepatan: <strong>{pt.speed} km/j</strong><br />
                                <small className="text-slate-600 block mt-1 leading-snug">{pt.address}</small>
                              </div>
                            </Popup>
                          </CircleMarker>
                        );
                      })}

                      <Marker position={[displayLat, displayLng]} icon={truckIcon}>
                        <Popup>
                          <div className="text-xs p-1 text-slate-900 font-sans">
                            <strong className="text-slate-900">{activeTruck.gpsName}</strong><br />
                            Tanggal: {selectedDate}<br />
                            Waktu: {displayTime}<br />
                            Kecepatan: {displaySpeed} km/j<br />
                            <small className="text-slate-600">{displayAddress}</small>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>

                    {/* Top Overlay Badge Filtered Date */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-xl shadow-md max-w-sm z-[400]">
                      <div className="text-[10px] uppercase font-extrabold text-blue-600 tracking-wider flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          {selectedCheckpoint ? `Terpilih Checkpoint Jam ${displayTime}` : `Posisi Koordinat (${selectedDate})`}
                        </span>
                        {selectedCheckpoint && (
                          <button
                            onClick={() => setSelectedCheckpoint(null)}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">{displayAddress}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-3">
                        <span>LAT: {displayLat.toFixed(5)}</span>
                        <span>LNG: {displayLng.toFixed(5)}</span>
                        <span>SPD: {displaySpeed} km/j</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Real Telemetry Readout (CARD STATUS ARMADA) */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div className="flex items-center gap-2 shrink-0">
                      <Truck className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-900 text-base">Status Armada</h3>
                    </div>
                    
                    {/* Active Truck Badge */}
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      {activeTruck?.gpsName || activeTruck?.name || 'Truk LED'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        {selectedCheckpoint ? `Lokasi Checkpoint (Jam ${displayTime})` : 'Lokasi / Alamat Terdeteksi'}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 mt-1 leading-snug">{displayAddress}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kecepatan Log</div>
                        <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                          {displaySpeed} <span className="text-xs font-normal text-slate-500">km/j</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status Mesin</div>
                        <div className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${displaySpeed > 0 || (isSelectedDateToday && activeTruck.engine === 'ON') ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
                          {displaySpeed > 0 || (isSelectedDateToday && activeTruck.engine === 'ON') ? 'ACTIVE / MOVE' : 'IDLE / OFF'}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Stempel Waktu Log</div>
                      <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">{displayTime}</div>
                    </div>
                  </div>
                </div>

                {/* History Checkpoints List Filtered by Date */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                    <span>Riwayat Rute ({selectedDate})</span>
                    <span className="text-[10px] text-emerald-600 font-bold">{realHistoryPoints.length} Checkpoint (1m)</span>
                  </h3>

                  <p className="text-[11px] text-slate-500">
                    Klik salah satu titik jam di bawah ini untuk melihat posisi langsung pada peta.
                  </p>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {realHistoryPoints.length > 0 ? (
                      realHistoryPoints.map((pt, idx) => {
                        const isSelected = selectedCheckpoint?.id === pt.id;
                        return (
                          <button
                            key={pt.id}
                            onClick={() => setSelectedCheckpoint(pt)}
                            className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-bold flex items-center gap-1.5 truncate max-w-[180px] text-xs ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                                <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-red-500'}`} />
                                {pt.address || `Checkpoint #${realHistoryPoints.length - idx}`}
                              </span>
                              <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                {pt.time?.split(' ')[1] || pt.time}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-500 pl-5">
                              <span>Kecepatan: <strong className="text-slate-800">{pt.speed} km/j</strong></span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        Tidak ada riwayat pergerakan GPS pada tanggal <span className="font-mono font-bold text-slate-600">{selectedDate}</span>.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
