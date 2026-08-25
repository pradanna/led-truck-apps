import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import {
  Video,
  Settings,
  Maximize2,
  RefreshCw,
  Camera,
  Car,
  Users,
  Bus,
  Gauge,
  Eye,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  X,
  Copy,
  Check,
  WifiOff,
  Signal,
  Wifi
} from 'lucide-react';
import AppLayout from '../Layouts/AppLayout';
import WebRtcPlayer from '../Components/WebRtcPlayer';
import { CctvCameraCardSkeleton } from '../Components/DashboardSkeleton';

export default function CctvMonitoring({ monitoringData = {} }) {
  const [data, setData] = useState(monitoringData);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'truck_1', 'truck_2'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'settings'
  const [selectedTruckForConfig, setSelectedTruckForConfig] = useState('truck_1');
  const [activePtzCamKey, setActivePtzCamKey] = useState(null); // key of camera with active PTZ overlay
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [fullscreenState, setFullscreenState] = useState('connected');

  // Isolated loading states per truck: default true if truck data not yet loaded from client fetch
  const [isTruck1Loading, setIsTruck1Loading] = useState(true);
  const [isTruck2Loading, setIsTruck2Loading] = useState(true);

  const truck1 = data?.truck_1 || {};
  const truck2 = data?.truck_2 || {};
  const summary = data?.summary || {};

  // Form State for Settings Modal
  const [formSettings, setFormSettings] = useState({
    truck_id: 'truck_1',
    nvr_ip: '',
    http_port: 443,
    rtsp_port: 554,
    username: 'admin',
    password: '',
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState('');
  const [snapshotFeedback, setSnapshotFeedback] = useState('');

  // Live timer for HUD
  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString('id-ID'));
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('id-ID'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Parallel & Isolated Micro-fetch for Truk 01 and Truk 02
  useEffect(() => {
    const controller = new AbortController();

    // 1. Fetch Truk 01 Independently
    fetch('/api/cctv/truck/truck_1', { signal: controller.signal })
      .then(res => res.json())
      .then(resJson => {
        if (resJson.success && resJson.data) {
          setData(prev => {
            const next = { ...prev, truck_1: resJson.data };
            // Update summary
            const t1 = resJson.data?.traffic || {};
            const t2 = prev?.truck_2?.traffic || {};
            next.summary = {
              total_motorcycles: (t1.motorcycles || 0) + (t2.motorcycles || 0),
              total_cars: (t1.cars || 0) + (t2.cars || 0),
              total_pedestrians: (t1.pedestrians || 0) + (t2.pedestrians || 0),
              total_buses: (t1.buses_trucks || 0) + (t2.buses_trucks || 0),
              grand_total_traffic: (t1.motorcycles || 0) + (t2.motorcycles || 0) + (t1.cars || 0) + (t2.cars || 0) + (t1.pedestrians || 0) + (t2.pedestrians || 0) + (t1.buses_trucks || 0) + (t2.buses_trucks || 0),
              total_audience_reach: (t1.estimated_reach || 0) + (t2.estimated_reach || 0),
            };
            return next;
          });
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error("Fetch Truck 1 CCTV error:", err);
      })
      .finally(() => setIsTruck1Loading(false));

    // 2. Fetch Truk 02 Independently
    fetch('/api/cctv/truck/truck_2', { signal: controller.signal })
      .then(res => res.json())
      .then(resJson => {
        if (resJson.success && resJson.data) {
          setData(prev => {
            const next = { ...prev, truck_2: resJson.data };
            const t1 = prev?.truck_1?.traffic || {};
            const t2 = resJson.data?.traffic || {};
            next.summary = {
              total_motorcycles: (t1.motorcycles || 0) + (t2.motorcycles || 0),
              total_cars: (t1.cars || 0) + (t2.cars || 0),
              total_pedestrians: (t1.pedestrians || 0) + (t2.pedestrians || 0),
              total_buses: (t1.buses_trucks || 0) + (t2.buses_trucks || 0),
              grand_total_traffic: (t1.motorcycles || 0) + (t2.motorcycles || 0) + (t1.cars || 0) + (t2.cars || 0) + (t1.pedestrians || 0) + (t2.pedestrians || 0) + (t1.buses_trucks || 0) + (t2.buses_trucks || 0),
              total_audience_reach: (t1.estimated_reach || 0) + (t2.estimated_reach || 0),
            };
            return next;
          });
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error("Fetch Truck 2 CCTV error:", err);
      })
      .finally(() => setIsTruck2Loading(false));

    return () => controller.abort(); // Auto abort saat pindah menu
  }, []);

  // Poll traffic & NVR telemetry data every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetch('/api/cctv/stream-data')
        .then(res => res.json())
        .then(resData => {
          if (resData.success && resData.data) {
            setData(resData.data);
          }
        })
        .catch(err => console.error("Poll CCTV error:", err));
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  // Set form when selected truck in modal changes
  useEffect(() => {
    const activeTruckObj = (selectedTruckForConfig === 'truck_1' ? truck1 : truck2)?.config || {};
    setFormSettings({
      truck_id: selectedTruckForConfig,
      nvr_ip: activeTruckObj.nvr_ip || '',
      http_port: activeTruckObj.http_port || 443,
      rtsp_port: activeTruckObj.rtsp_port || 554,
      username: activeTruckObj.username || 'admin',
      password: activeTruckObj.password || '',
    });
  }, [selectedTruckForConfig, data]);

  // Handle Manual Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/cctv/stream-data?force=1');
      const resData = await res.json();
      if (resData.success) {
        setData(resData.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg('');
    try {
      const res = await fetch('/api/cctv/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(formSettings)
      });
      const resJson = await res.json();
      if (resJson.success) {
        setData(resJson.data);
        setSaveSuccessMsg(resJson.message || 'Pengaturan NVR berhasil disimpan!');
        setTimeout(() => {
          setSaveSuccessMsg('');
          setActiveModal(null);
        }, 1500);
      }
    } catch (err) {
      alert("Gagal menyimpan pengaturan NVR.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Snapshot & Direct Download to Device (PC / Phone)
  const handleTakeSnapshot = async (truckId, channelId) => {
    setSnapshotFeedback(`Mengambil snapshot ${channelId}...`);
    try {
      const res = await fetch('/api/cctv/snapshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({ truck_id: truckId, channel: channelId })
      });
      const json = await res.json();
      
      if (json.success && json.image_url) {
        // Trigger direct browser download
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
        const truckLabel = truckId === 'truck_1' ? 'Truk01' : 'Truk02';
        const fileName = `Snapshot_${truckLabel}_${channelId}_${dateStr}_${timeStr}.jpg`;

        const downloadLink = document.createElement('a');
        downloadLink.href = json.image_url;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setSnapshotFeedback(`✓ Snapshot ${channelId} berhasil diunduh ke perangkat!`);
        setTimeout(() => setSnapshotFeedback(''), 3500);
      } else {
        // Fallback: If snapshot frame is not immediately returned as base64, try frame.jpeg
        const streamKey = `${truckId}_${channelId.toLowerCase()}`;
        const fallbackUrl = `/api/webrtc/api/frame.jpeg?src=${streamKey}`;
        
        const downloadLink = document.createElement('a');
        downloadLink.href = fallbackUrl;
        downloadLink.download = `Snapshot_${truckId}_${channelId}_${Date.now()}.jpg`;
        downloadLink.target = '_blank';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setSnapshotFeedback(`✓ Snapshot ${channelId} sedang diunduh!`);
        setTimeout(() => setSnapshotFeedback(''), 3500);
      }
    } catch (e) {
      setSnapshotFeedback('Gagal mengambil snapshot kamera');
      setTimeout(() => setSnapshotFeedback(''), 2500);
    }
  };

  // Per-Feed Zoom & Pan State for live card controls
  const [feedZoomMap, setFeedZoomMap] = useState({});

  const handleFeedPtz = (truckId, channelId, command) => {
    const key = `${truckId}-${channelId}`;
    setFeedZoomMap(prev => {
      const current = prev[key] || { zoom: 1, panX: 0, panY: 0 };
      let newZoom = current.zoom;
      let newPanX = current.panX;
      let newPanY = current.panY;

      if (command === 'ZOOM_IN') {
        newZoom = Math.min(newZoom + 0.5, 4);
      } else if (command === 'ZOOM_OUT') {
        newZoom = Math.max(newZoom - 0.5, 1);
        if (newZoom === 1) {
          newPanX = 0;
          newPanY = 0;
        }
      } else if (command === 'UP') {
        newPanY += 25;
      } else if (command === 'DOWN') {
        newPanY -= 25;
      } else if (command === 'LEFT') {
        newPanX += 25;
      } else if (command === 'RIGHT') {
        newPanX -= 25;
      } else if (command === 'STOP') {
        newZoom = 1;
        newPanX = 0;
        newPanY = 0;
      }

      return {
        ...prev,
        [key]: { zoom: newZoom, panX: newPanX, panY: newPanY }
      };
    });

    // Send API command in background
    fetch('/api/cctv/ptz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
      },
      body: JSON.stringify({
        truck_id: truckId,
        channel: channelId,
        command: command,
        speed: 5
      })
    }).catch(() => {});
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(''), 2000);
  };

  // Build Camera Feeds list directly from real API responses
  const buildFeeds = () => {
    const feeds = [];
    
    // Truck 1 Cams
    const t1Config = truck1?.config || { name: 'Truk LED 01', nvr_ip: '103.144.175.22' };
    const t1Online = truck1?.online ?? false;
    const ch1_t1 = truck1?.channels?.CH1 || {};
    const ch2_t1 = truck1?.channels?.CH2 || {};

    feeds.push({
      truckId: 'truck_1',
      truckName: t1Config.name || 'Truk LED 01',
      truckIp: t1Config.nvr_ip || '103.144.175.22',
      channelId: 'CH1',
      channelName: ch1_t1.name || 'Kamera Belakang (Layar LED)',
      type: 'LED_SCREEN',
      online: t1Online,
      status: ch1_t1.status || (t1Online ? 'ONLINE' : 'DISCONNECTED'),
      statusReason: ch1_t1.status_reason || truck1?.status_message || 'Kamera Belum Terhubung',
      rtspUrl: ch1_t1.rtsp_url || `rtsp://${t1Config.nvr_ip}:554/live/ch1`,
      liveImage: ch1_t1.live_image || null,
      fps: ch1_t1.fps || 0,
      bitrate: ch1_t1.bitrate || '0 kbps',
      res: ch1_t1.resolution || '1080P FHD',
      isTrafficCam: false,
    });

    feeds.push({
      truckId: 'truck_1',
      truckName: t1Config.name || 'Truk LED 01',
      truckIp: t1Config.nvr_ip || '103.144.175.22',
      channelId: 'CH2',
      channelName: ch2_t1.name || 'Kamera Depan (Traffic & AI)',
      type: 'TRAFFIC_AI',
      online: t1Online,
      status: ch2_t1.status || (t1Online ? 'ONLINE' : 'DISCONNECTED'),
      statusReason: ch2_t1.status_reason || truck1?.status_message || 'Kamera Belum Terhubung',
      rtspUrl: ch2_t1.rtsp_url || `rtsp://${t1Config.nvr_ip}:554/live/ch2`,
      liveImage: ch2_t1.live_image || null,
      fps: ch2_t1.fps || 0,
      bitrate: ch2_t1.bitrate || '0 kbps',
      res: ch2_t1.resolution || '1080P FHD',
      isTrafficCam: true,
      traffic: truck1?.traffic,
    });

    // Truck 2 Cams
    const t2Config = truck2?.config || { name: 'Truk LED 02', nvr_ip: '103.144.175.28' };
    const t2Online = truck2?.online ?? false;
    const ch1_t2 = truck2?.channels?.CH1 || {};
    const ch2_t2 = truck2?.channels?.CH2 || {};

    feeds.push({
      truckId: 'truck_2',
      truckName: t2Config.name || 'Truk LED 02',
      truckIp: t2Config.nvr_ip || '103.144.175.28',
      channelId: 'CH1',
      channelName: ch1_t2.name || 'Kamera Belakang (Layar LED)',
      type: 'LED_SCREEN',
      online: t2Online,
      status: ch1_t2.status || (t2Online ? 'ONLINE' : 'DISCONNECTED'),
      statusReason: ch1_t2.status_reason || truck2?.status_message || 'Kamera Belum Terhubung',
      rtspUrl: ch1_t2.rtsp_url || `rtsp://${t2Config.nvr_ip}:70/live/ch1`,
      liveImage: ch1_t2.live_image || null,
      fps: ch1_t2.fps || 0,
      bitrate: ch1_t2.bitrate || '0 kbps',
      res: ch1_t2.resolution || '1080P FHD',
      isTrafficCam: false,
    });

    feeds.push({
      truckId: 'truck_2',
      truckName: t2Config.name || 'Truk LED 02',
      truckIp: t2Config.nvr_ip || '103.144.175.28',
      channelId: 'CH2',
      channelName: ch2_t2.name || 'Kamera Depan (Traffic & AI)',
      type: 'TRAFFIC_AI',
      online: t2Online,
      status: ch2_t2.status || (t2Online ? 'ONLINE' : 'DISCONNECTED'),
      statusReason: ch2_t2.status_reason || truck2?.status_message || 'Kamera Belum Terhubung',
      rtspUrl: ch2_t2.rtsp_url || `rtsp://${t2Config.nvr_ip}:70/live/ch2`,
      liveImage: ch2_t2.live_image || null,
      fps: ch2_t2.fps || 0,
      bitrate: ch2_t2.bitrate || '0 kbps',
      res: ch2_t2.resolution || '1080P FHD',
      isTrafficCam: true,
      traffic: truck2?.traffic,
    });

    return feeds;
  };

  const allFeeds = buildFeeds();
  const filteredFeeds = allFeeds.filter(feed => {
    if (activeFilter === 'truck_1') return feed.truckId === 'truck_1';
    if (activeFilter === 'truck_2') return feed.truckId === 'truck_2';
    return true;
  });

  const totalActiveCams = allFeeds.filter(f => f.online).length;

  return (
    <AppLayout
      activeMenu="cctv"
      title="Live CCTV & Traffic Monitoring"
      subtitle="Monitoring stream 4 Kamera & AI Traffic terhubung langsung ke NVR HOLOWITS"
      statusBadge={
        totalActiveCams > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            {totalActiveCams}/4 CHANNELS ONLINE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            NVR DISCONNECTED (CHECK IP)
          </span>
        )
      }
    >
      <Head title="Live CCTV Monitoring & Traffic Analytics - LED-FLX" />

      {/* ALERT TOAST FEEDBACK */}
      {snapshotFeedback && (
        <div className="fixed top-20 right-8 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce border border-blue-400">
          <CheckCircle2 className="w-4 h-4" />
          {snapshotFeedback}
        </div>
      )}

      {/* TOP HEADER CONTROLS: FILTER & SETTINGS (LIGHT MODE) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mr-2 flex items-center gap-1.5">
            <Video className="w-4 h-4 text-blue-600" /> Tampilan Feed:
          </span>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            Semua Kamera (4 Grid)
          </button>
          <button
            onClick={() => setActiveFilter('truck_1')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === 'truck_1'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${truck1.online ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
            Truk 01 ({truck1.status || 'OFFLINE'})
          </button>
          <button
            onClick={() => setActiveFilter('truck_2')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === 'truck_2'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${truck2.online ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
            Truk 02 ({truck2.status || 'OFFLINE'})
          </button>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* REAL-TIME AI TRAFFIC ANALYTICS BAR (DATA DARI API DINAMIS MENGIKUTI FILTER) */}
      {(() => {
        // Hitung metrik dinamis berdasarkan filter aktif: 'all', 'truck_1', 'truck_2'
        let currentMotor = 0;
        let currentCar = 0;
        let currentPed = 0;
        let currentBus = 0;
        let currentTotal = 0;

        const t1Traffic = truck1?.traffic || {};
        const t2Traffic = truck2?.traffic || {};

        if (activeFilter === 'truck_1') {
          currentMotor = t1Traffic.motorcycles || 0;
          currentCar = t1Traffic.cars || 0;
          currentPed = t1Traffic.pedestrians || 0;
          currentBus = t1Traffic.buses_trucks || 0;
          currentTotal = currentMotor + currentCar + currentPed + currentBus;
        } else if (activeFilter === 'truck_2') {
          currentMotor = t2Traffic.motorcycles || 0;
          currentCar = t2Traffic.cars || 0;
          currentPed = t2Traffic.pedestrians || 0;
          currentBus = t2Traffic.buses_trucks || 0;
          currentTotal = currentMotor + currentCar + currentPed + currentBus;
        } else {
          currentMotor = (t1Traffic.motorcycles || 0) + (t2Traffic.motorcycles || 0);
          currentCar = (t1Traffic.cars || 0) + (t2Traffic.cars || 0);
          currentPed = (t1Traffic.pedestrians || 0) + (t2Traffic.pedestrians || 0);
          currentBus = (t1Traffic.buses_trucks || 0) + (t2Traffic.buses_trucks || 0);
          currentTotal = currentMotor + currentCar + currentPed + currentBus;
        }

        const isCurrentLoading = (activeFilter === 'truck_1' && isTruck1Loading) ||
                                (activeFilter === 'truck_2' && isTruck2Loading) ||
                                (activeFilter === 'all' && (isTruck1Loading && isTruck2Loading));

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Motor */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Sepeda Motor</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <Gauge className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-amber-600 font-mono">
                  {isCurrentLoading ? (
                    <div className="h-7 w-16 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    currentMotor
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Unit terhitung NVR API</div>
              </div>
            </div>

            {/* Card 2: Mobil */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Mobil Pribadi</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-blue-600 font-mono">
                  {isCurrentLoading ? (
                    <div className="h-7 w-16 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    currentCar
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Kendaraan roda 4</div>
              </div>
            </div>

            {/* Card 3: Orang / Pejalan Kaki */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Pejalan Kaki</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-emerald-600 font-mono">
                  {isCurrentLoading ? (
                    <div className="h-7 w-16 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    currentPed
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Target orang (Face/Ped)</div>
              </div>
            </div>

            {/* Card 4: Bus & Truk */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Bus & Truk</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                  <Bus className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-purple-600 font-mono">
                  {isCurrentLoading ? (
                    <div className="h-7 w-16 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    currentBus
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Kendaraan besar</div>
              </div>
            </div>

            {/* Card 5: Total Traffic */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Lalu Lintas</span>
                <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center">
                  <Gauge className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-cyan-700 font-mono">
                  {isCurrentLoading ? (
                    <div className="h-7 w-16 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    currentTotal
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Akumulasi sensor kamera
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CCTV STREAM VIDEO GRID (4 CAMERAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* TRUK 01 CAMERAS (CH1 & CH2) */}
        {(activeFilter === 'all' || activeFilter === 'truck_1') && (
          isTruck1Loading ? (
            <>
              <CctvCameraCardSkeleton />
              <CctvCameraCardSkeleton />
            </>
          ) : (
            filteredFeeds.filter(f => f.truckId === 'truck_1').map((feed, idx) => (
              <div
                key={`${feed.truckId}-${feed.channelId}-${idx}`}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm flex flex-col group relative"
              >
                {/* VIDEO PLAYER CONTAINER WITH HUD OVERLAY */}
                <div className="relative aspect-video bg-slate-950 overflow-hidden select-none flex items-center justify-center">
                  <WebRtcPlayer
                    streamKey={`${feed.truckId}_${feed.channelId.toLowerCase()}`}
                    isOnline={true}
                    channelName={`${feed.truckName} - ${feed.channelName}`}
                    fallbackImage={feed.liveImage}
                    zoom={feedZoomMap[`${feed.truckId}-${feed.channelId}`]?.zoom || 1}
                    panX={feedZoomMap[`${feed.truckId}-${feed.channelId}`]?.panX || 0}
                    panY={feedZoomMap[`${feed.truckId}-${feed.channelId}`]?.panY || 0}
                  />

                  {/* LIVE ON-SCREEN FLOATING PTZ OVERLAY */}
                  {activePtzCamKey === `${feed.truckId}-${feed.channelId}` && (
                    <div className="absolute top-12 right-3 z-30 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-3 rounded-2xl shadow-2xl flex flex-col items-center gap-2 select-none animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between w-full pb-1 border-b border-slate-700/60 text-[10px] font-mono font-bold text-slate-300">
                        <span className="flex items-center gap-1"><Sliders className="w-3 h-3 text-indigo-400" /> LIVE PTZ & ZOOM</span>
                        <button
                          onClick={() => setActivePtzCamKey(null)}
                          className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Directional Pad */}
                      <div className="flex flex-col items-center gap-1.5 py-1">
                        <button
                          onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'UP')}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-white flex items-center justify-center border border-slate-700 shadow-xs transition-all cursor-pointer"
                          title="Pan Atas"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'LEFT')}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-white flex items-center justify-center border border-slate-700 shadow-xs transition-all cursor-pointer"
                            title="Pan Kiri"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'STOP')}
                            className="w-7 h-7 rounded-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 text-rose-300 text-[8px] font-mono font-bold flex items-center justify-center cursor-pointer"
                            title="Reset Viewport"
                          >
                            1x
                          </button>

                          <button
                            onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'RIGHT')}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-white flex items-center justify-center border border-slate-700 shadow-xs transition-all cursor-pointer"
                            title="Pan Kanan"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'DOWN')}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-white flex items-center justify-center border border-slate-700 shadow-xs transition-all cursor-pointer"
                          title="Pan Bawah"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Zoom Controls */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-700/60 w-full">
                        <button
                          onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'ZOOM_IN')}
                          className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-md text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-3.5 h-3.5" /> + In
                        </button>
                        <button
                          onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'ZOOM_OUT')}
                          className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white rounded-md text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" /> - Out
                        </button>
                      </div>

                      {/* Zoom Level Indicator */}
                      <div className="text-[10px] font-mono text-emerald-400 bg-black/50 border border-slate-700 px-2 py-0.5 rounded text-center w-full">
                        Zoom: {(feedZoomMap[`${feed.truckId}-${feed.channelId}`]?.zoom || 1).toFixed(1)}x
                      </div>
                    </div>
                  )}

                  {/* TOP HUD BAR */}
                  <div className="absolute top-0 inset-x-0 bg-linear-to-b from-black/80 via-black/40 to-transparent p-3.5 flex items-center justify-between pointer-events-none z-10">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-white font-mono font-black text-[10px] tracking-wider flex items-center gap-1 shadow-xs ${
                        feed.online ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span> {feed.status}
                      </span>
                      <span className="bg-slate-900/80 border border-slate-700/80 text-slate-200 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wide">
                        {feed.channelId}: {feed.channelName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900/80 border border-slate-700/80 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                        {feed.fps} FPS
                      </span>
                      <span className="bg-slate-900/80 border border-slate-700/80 text-blue-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                        {feed.bitrate}
                      </span>
                    </div>
                  </div>

                  {/* BOTTOM HUD BAR */}
                  <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/85 via-black/50 to-transparent p-3.5 flex items-center justify-between pointer-events-none z-10">
                    <div>
                      <div className="text-white font-mono font-bold text-xs flex items-center gap-2 drop-shadow-md">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>{new Date().toISOString().split('T')[0]} {liveTime} WIB</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-300 drop-shadow mt-0.5">
                        NVR IP: <strong className="text-white">{feed.truckIp}</strong> ({feed.truckName})
                      </div>
                    </div>

                    {feed.isTrafficCam && feed.traffic && (
                      <div className="bg-black/70 backdrop-blur-xs border border-emerald-500/50 px-2.5 py-1 rounded text-right">
                        <div className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                          AI TRAFFIC COUNT
                        </div>
                        <div className="text-xs font-mono font-extrabold text-white">
                          🏍️ {feed.traffic.motorcycles} | 🚗 {feed.traffic.cars} | 🚶 {feed.traffic.pedestrians}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* HOVER ACTION OVERLAY BUTTONS */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20">
                    <button
                      onClick={() => handleTakeSnapshot(feed.truckId, feed.channelId)}
                      className="p-3 bg-white hover:bg-blue-600 text-slate-800 hover:text-white rounded-xl border border-slate-200 shadow-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
                      title="Ambil Snapshot Kamera"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snapshot</span>
                    </button>

                    <button
                      onClick={() => {
                        const key = `${feed.truckId}-${feed.channelId}`;
                        setActivePtzCamKey(prev => prev === key ? null : key);
                      }}
                      className={`p-3 rounded-xl border shadow-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold ${
                        activePtzCamKey === `${feed.truckId}-${feed.channelId}`
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-white hover:bg-indigo-600 text-slate-800 hover:text-white border-slate-200'
                      }`}
                      title="Live PTZ Control"
                    >
                      <Sliders className="w-4 h-4" />
                      <span>{activePtzCamKey === `${feed.truckId}-${feed.channelId}` ? 'Tutup PTZ' : 'Live PTZ'}</span>
                    </button>

                    <button
                      onClick={() => setFullscreenCam(feed)}
                      className="p-3 bg-white hover:bg-slate-800 text-slate-800 hover:text-white rounded-xl border border-slate-200 shadow-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
                      title="Fullscreen Preview"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Fullscreen</span>
                    </button>
                  </div>
                </div>

                {/* BOTTOM FOOTER INFO & RTSP QUICK COPY */}
                <div className="p-3.5 bg-white flex items-center justify-between border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${feed.online ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    <span className="font-extrabold text-slate-800">{feed.truckName}</span>
                    <span className="text-[11px] text-slate-500 font-medium">· {feed.res}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(feed.rtspUrl)}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 font-mono text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Salin RTSP Stream URL"
                    >
                      {copiedUrl === feed.rtspUrl ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy RTSP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {/* TRUK 02 CAMERAS (CH1 & CH2) */}
        {(activeFilter === 'all' || activeFilter === 'truck_2') && (
          isTruck2Loading ? (
            <>
              <CctvCameraCardSkeleton />
              <CctvCameraCardSkeleton />
            </>
          ) : (
            filteredFeeds.filter(f => f.truckId === 'truck_2').map((feed, idx) => (
              <div
                key={`${feed.truckId}-${feed.channelId}-${idx}`}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm flex flex-col group relative"
              >
                {/* VIDEO PLAYER CONTAINER WITH HUD OVERLAY */}
                <div className="relative aspect-video bg-slate-950 overflow-hidden select-none flex items-center justify-center">
                  <WebRtcPlayer
                    streamKey={`${feed.truckId}_${feed.channelId.toLowerCase()}`}
                    isOnline={true}
                    channelName={`${feed.truckName} - ${feed.channelName}`}
                    fallbackImage={feed.liveImage}
                    zoom={feedZoomMap[`${feed.truckId}-${feed.channelId}`]?.zoom || 1}
                    panX={feedZoomMap[`${feed.truckId}-${feed.channelId}`]?.panX || 0}
                    panY={feedZoomMap[`${feed.truckId}-${feed.channelId}`]?.panY || 0}
                  />

                  {/* LIVE ON-SCREEN FLOATING PTZ OVERLAY */}
                  {activePtzCamKey === `${feed.truckId}-${feed.channelId}` && (
                    <div className="absolute top-12 right-3 z-30 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-3 rounded-2xl shadow-2xl flex flex-col items-center gap-2 select-none animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between w-full pb-1 border-b border-slate-700/60 text-[10px] font-mono font-bold text-slate-300">
                        <span className="flex items-center gap-1"><Sliders className="w-3 h-3 text-indigo-400" /> LIVE PTZ & ZOOM</span>
                        <button
                          onClick={() => setActivePtzCamKey(null)}
                          className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Directional Pad */}
                      <div className="flex flex-col items-center gap-1.5 py-1">
                        <button
                          onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'UP')}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-white flex items-center justify-center border border-slate-700 shadow-xs transition-all cursor-pointer"
                          title="Pan Atas"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'LEFT')}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-white flex items-center justify-center border border-slate-700 shadow-xs transition-all cursor-pointer"
                            title="Pan Kiri"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'STOP')}
                            className="w-7 h-7 rounded-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 text-rose-300 text-[8px] font-mono font-bold flex items-center justify-center cursor-pointer"
                            title="Reset Viewport"
                          >
                            1x
                          </button>

                          <button
                            onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'RIGHT')}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-white flex items-center justify-center border border-slate-700 shadow-xs transition-all cursor-pointer"
                            title="Pan Kanan"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'DOWN')}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-white flex items-center justify-center border border-slate-700 shadow-xs transition-all cursor-pointer"
                          title="Pan Bawah"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Zoom Controls */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-700/60 w-full">
                        <button
                          onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'ZOOM_IN')}
                          className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-md text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-3.5 h-3.5" /> + In
                        </button>
                        <button
                          onClick={() => handleFeedPtz(feed.truckId, feed.channelId, 'ZOOM_OUT')}
                          className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white rounded-md text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" /> - Out
                        </button>
                      </div>

                      {/* Zoom Level Indicator */}
                      <div className="text-[10px] font-mono text-emerald-400 bg-black/50 border border-slate-700 px-2 py-0.5 rounded text-center w-full">
                        Zoom: {(feedZoomMap[`${feed.truckId}-${feed.channelId}`]?.zoom || 1).toFixed(1)}x
                      </div>
                    </div>
                  )}

                  {/* TOP HUD BAR */}
                  <div className="absolute top-0 inset-x-0 bg-linear-to-b from-black/80 via-black/40 to-transparent p-3.5 flex items-center justify-between pointer-events-none z-10">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-white font-mono font-black text-[10px] tracking-wider flex items-center gap-1 shadow-xs ${
                        feed.online ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span> {feed.status}
                      </span>
                      <span className="bg-slate-900/80 border border-slate-700/80 text-slate-200 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wide">
                        {feed.channelId}: {feed.channelName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900/80 border border-slate-700/80 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                        {feed.fps} FPS
                      </span>
                      <span className="bg-slate-900/80 border border-slate-700/80 text-blue-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                        {feed.bitrate}
                      </span>
                    </div>
                  </div>

                  {/* BOTTOM HUD BAR */}
                  <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/85 via-black/50 to-transparent p-3.5 flex items-center justify-between pointer-events-none z-10">
                    <div>
                      <div className="text-white font-mono font-bold text-xs flex items-center gap-2 drop-shadow-md">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>{new Date().toISOString().split('T')[0]} {liveTime} WIB</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-300 drop-shadow mt-0.5">
                        NVR IP: <strong className="text-white">{feed.truckIp}</strong> ({feed.truckName})
                      </div>
                    </div>

                    {feed.isTrafficCam && feed.traffic && (
                      <div className="bg-black/70 backdrop-blur-xs border border-emerald-500/50 px-2.5 py-1 rounded text-right">
                        <div className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                          AI TRAFFIC COUNT
                        </div>
                        <div className="text-xs font-mono font-extrabold text-white">
                          🏍️ {feed.traffic.motorcycles} | 🚗 {feed.traffic.cars} | 🚶 {feed.traffic.pedestrians}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* HOVER ACTION OVERLAY BUTTONS */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20">
                    <button
                      onClick={() => handleTakeSnapshot(feed.truckId, feed.channelId)}
                      className="p-3 bg-white hover:bg-blue-600 text-slate-800 hover:text-white rounded-xl border border-slate-200 shadow-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
                      title="Ambil Snapshot Kamera"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snapshot</span>
                    </button>

                    <button
                      onClick={() => {
                        const key = `${feed.truckId}-${feed.channelId}`;
                        setActivePtzCamKey(prev => prev === key ? null : key);
                      }}
                      className={`p-3 rounded-xl border shadow-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold ${
                        activePtzCamKey === `${feed.truckId}-${feed.channelId}`
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-white hover:bg-indigo-600 text-slate-800 hover:text-white border-slate-200'
                      }`}
                      title="Live PTZ Control"
                    >
                      <Sliders className="w-4 h-4" />
                      <span>{activePtzCamKey === `${feed.truckId}-${feed.channelId}` ? 'Tutup PTZ' : 'Live PTZ'}</span>
                    </button>

                    <button
                      onClick={() => setFullscreenCam(feed)}
                      className="p-3 bg-white hover:bg-slate-800 text-slate-800 hover:text-white rounded-xl border border-slate-200 shadow-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
                      title="Fullscreen Preview"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Fullscreen</span>
                    </button>
                  </div>
                </div>

                {/* BOTTOM FOOTER INFO & RTSP QUICK COPY */}
                <div className="p-3.5 bg-white flex items-center justify-between border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${feed.online ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    <span className="font-extrabold text-slate-800">{feed.truckName}</span>
                    <span className="text-[11px] text-slate-500 font-medium">· {feed.res}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(feed.rtspUrl)}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 font-mono text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Salin RTSP Stream URL"
                    >
                      {copiedUrl === feed.rtspUrl ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy RTSP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* ========================================================
          MODAL: PENGATURAN IP PUBLIC HOLOWITS NVR PER TRUK
         ======================================================== */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Pengaturan IP Public NVR HOLOWITS</h3>
                  <p className="text-xs text-slate-500">Hubungkan live stream CCTV per unit truk secara independen</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Alert */}
            {saveSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* Pilih Truk */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pilih Unit Truk
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTruckForConfig('truck_1')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedTruckForConfig === 'truck_1'
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="text-xs font-bold">Truk LED 01</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Status: {truck1.status || 'UNCONFIGURED'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTruckForConfig('truck_2')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedTruckForConfig === 'truck_2'
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="text-xs font-bold">Truk LED 02</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Status: {truck2.status || 'UNCONFIGURED'}
                    </div>
                  </button>
                </div>
              </div>

              {/* IP Public NVR & Port */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    IP Public NVR / Hostname
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 103.144.175.22"
                    value={formSettings.nvr_ip}
                    onChange={(e) => setFormSettings({ ...formSettings, nvr_ip: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    RTSP Port
                  </label>
                  <input
                    type="number"
                    value={formSettings.rtsp_port}
                    onChange={(e) => setFormSettings({ ...formSettings, rtsp_port: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username NVR
                  </label>
                  <input
                    type="text"
                    value={formSettings.username}
                    onChange={(e) => setFormSettings({ ...formSettings, username: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password NVR
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={formSettings.password}
                    onChange={(e) => setFormSettings({ ...formSettings, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Channel Map Info */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800">Mapping Channel NVR:</div>
                <div className="flex items-center justify-between">
                  <span>· <strong>CH1</strong>: Kamera Belakang (Layar LED)</span>
                  <span className="font-mono text-blue-600 font-bold">LiveStream/CH1/main</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>· <strong>CH2</strong>: Kamera Depan (Trafik & AI)</span>
                  <span className="font-mono text-blue-600 font-bold">LiveStream/CH2/main</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm shadow-blue-600/30"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan & Tes Koneksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PTZ CONTROL & PRESETS
         ======================================================== */}
      {activeModal === 'ptz' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">PTZ Controller</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Mengontrol kamera: <strong className="text-slate-900">{ptzTargetCam.channelName}</strong> ({ptzTargetCam.truckName})
            </div>

            {/* Directional Pad */}
            <div className="flex flex-col items-center justify-center gap-2 py-3 bg-slate-50 rounded-2xl border border-slate-100">
              <button
                onClick={() => handleFeedPtz(ptzTargetCam.truckId, ptzTargetCam.channelId, 'UP')}
                className="w-12 h-12 rounded-xl bg-white hover:bg-indigo-600 text-slate-800 hover:text-white border border-slate-200 flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Pan Up"
              >
                <ArrowUp className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-6">
                <button
                  onClick={() => handleFeedPtz(ptzTargetCam.truckId, ptzTargetCam.channelId, 'LEFT')}
                  className="w-12 h-12 rounded-xl bg-white hover:bg-indigo-600 text-slate-800 hover:text-white border border-slate-200 flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Pan Left"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => handleFeedPtz(ptzTargetCam.truckId, ptzTargetCam.channelId, 'STOP')}
                  className="w-10 h-10 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[10px] font-mono font-bold text-indigo-700 active:scale-95 cursor-pointer"
                  title="Reset Zoom (1x)"
                >
                  1x
                </button>
                <button
                  onClick={() => handleFeedPtz(ptzTargetCam.truckId, ptzTargetCam.channelId, 'RIGHT')}
                  className="w-12 h-12 rounded-xl bg-white hover:bg-indigo-600 text-slate-800 hover:text-white border border-slate-200 flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Pan Right"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>

              <button
                onClick={() => handleFeedPtz(ptzTargetCam.truckId, ptzTargetCam.channelId, 'DOWN')}
                className="w-12 h-12 rounded-xl bg-white hover:bg-indigo-600 text-slate-800 hover:text-white border border-slate-200 flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Pan Down"
              >
                <ArrowDown className="w-6 h-6" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleFeedPtz(ptzTargetCam.truckId, ptzTargetCam.channelId, 'ZOOM_IN')}
                className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-2 border border-slate-200 cursor-pointer active:scale-95"
              >
                <ZoomIn className="w-4 h-4 text-emerald-600" /> Zoom In (+)
              </button>
              <button
                onClick={() => handleFeedPtz(ptzTargetCam.truckId, ptzTargetCam.channelId, 'ZOOM_OUT')}
                className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-2 border border-slate-200 cursor-pointer active:scale-95"
              >
                <ZoomOut className="w-4 h-4 text-rose-600" /> Zoom Out (-)
              </button>
            </div>

            <div className="text-center text-xs font-mono font-bold text-indigo-600 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
              Tingkat Zoom: {(feedZoomMap[`${ptzTargetCam.truckId}-${ptzTargetCam.channelId}`]?.zoom || 1).toFixed(1)}x
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: FULLSCREEN CCTV PREVIEW WITH WEBRTC PLAYER
         ======================================================== */}
      {fullscreenCam && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between select-none">
          {/* Header */}
          <div className="p-4 bg-linear-to-b from-black/90 to-transparent flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded text-white font-mono font-bold text-xs flex items-center gap-1.5 ${
                fullscreenState === 'connected' ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                {fullscreenState === 'connected' ? 'LIVE ONLINE' : 'CONNECTING...'}
              </span>
              <span className="text-white font-bold text-sm">
                {fullscreenCam.truckName} - {fullscreenCam.channelName} ({fullscreenCam.channelId})
              </span>
            </div>
            <button
              onClick={() => setFullscreenCam(null)}
              className="text-white bg-slate-800/80 hover:bg-slate-700 p-2.5 rounded-xl border border-slate-700 cursor-pointer flex items-center gap-2 text-xs font-bold"
            >
              <X className="w-5 h-5" />
              <span>Keluar Fullscreen</span>
            </button>
          </div>

          {/* Fullscreen Video Body */}
          <div className="flex-1 w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
            <WebRtcPlayer
              streamKey={`${fullscreenCam.truckId}_${fullscreenCam.channelId.toLowerCase()}`}
              isOnline={true}
              channelName={`${fullscreenCam.truckName} - ${fullscreenCam.channelName}`}
              fallbackImage={fullscreenCam.liveImage}
              onStatusChange={(status) => setFullscreenState(status)}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-linear-to-t from-black/90 to-transparent flex items-center justify-between text-xs font-mono text-slate-300 z-20">
            <div>NVR: {fullscreenCam.truckIp} | Stream: {fullscreenCam.channelId}</div>
            <div>{fullscreenCam.res} @ {fullscreenCam.fps} FPS</div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
