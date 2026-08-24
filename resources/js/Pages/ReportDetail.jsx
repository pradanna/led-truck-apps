import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Navbar from '@/Components/Navbar';
import DownloadProgressBar from '@/Components/DownloadProgressBar';
import {
    SkeletonReportOverview,
    SkeletonReportTraffic,
    SkeletonPlaylogTable,
    SkeletonReportGps
} from '@/Components/DashboardSkeleton';
import {
    FileSpreadsheet,
    BarChart3,
    ListMusic,
    Navigation,
    LayoutDashboard,
    Download,
    Printer,
    RefreshCw,
    Calendar,
    Truck,
    Users,
    Car,
    Gauge,
    Bus,
    Eye,
    TrendingUp,
    Clock,
    CheckCircle2,
    Search,
    MapPin,
    Radio,
    ShieldCheck,
    ArrowUpRight,
    Play,
    Zap,
    Filter
} from 'lucide-react';

export default function ReportDetail({
    filters = { truck_id: 'all', date_from: '', date_to: '' },
    summaryKPI = {},
    trafficData = {},
    playlogData = {},
    gpsData = {},
    trucks = []
}) {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'traffic', 'playlog', 'gps'
    const [selectedTruck, setSelectedTruck] = useState(filters.truck_id || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [searchMateri, setSearchMateri] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [downloadState, setDownloadState] = useState({
        isDownloading: false,
        type: '', // 'PDF' or 'Excel'
        progress: 0,
        message: ''
    });

    const handleDownload = async (type, e) => {
        if (e) e.preventDefault();
        const endpoint = type === 'PDF' ? '/api/report/export-pdf' : '/api/report/export-excel';
        const url = `${endpoint}?tab=${activeTab}&truck_id=${selectedTruck}&date_from=${dateFrom}&date_to=${dateTo}`;

        setDownloadState({
            isDownloading: true,
            type,
            progress: 15,
            message: `Menyiapkan data ${type} untuk tab terpilih...`
        });

        const progressTimer1 = setTimeout(() => {
            setDownloadState(prev => ({ ...prev, progress: 45, message: `Memformat dan menyusun dokumen ${type}...` }));
        }, 300);

        const progressTimer2 = setTimeout(() => {
            setDownloadState(prev => ({ ...prev, progress: 80, message: `Mengompilasi berkas ${type}...` }));
        }, 700);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Gagal mengunduh berkas');

            const blob = await response.blob();
            clearTimeout(progressTimer1);
            clearTimeout(progressTimer2);

            setDownloadState(prev => ({ ...prev, progress: 100, message: `Selesai! Memulai proses simpan...` }));

            // Get filename from Content-Disposition header if available
            let fileName = `Laporan_${activeTab}_${dateFrom}_sd_${dateTo}.${type === 'PDF' ? 'pdf' : 'csv'}`;
            const disposition = response.headers.get('Content-Disposition');
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                if (matches != null && matches[1]) {
                    fileName = matches[1].replace(/['"]/g, '');
                }
            }

            // Create download link
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);

            setTimeout(() => {
                setDownloadState({ isDownloading: false, type: '', progress: 0, message: '' });
            }, 800);
        } catch (err) {
            clearTimeout(progressTimer1);
            clearTimeout(progressTimer2);
            setDownloadState({
                isDownloading: true,
                type,
                progress: 100,
                message: `Gagal mengunduh berkas. Silakan coba kembali.`
            });
            setTimeout(() => {
                setDownloadState({ isDownloading: false, type: '', progress: 0, message: '' });
            }, 2000);
        }
    };

    const handleFilterApply = (e) => {
        if (e) e.preventDefault();
        setIsRefreshing(true);
        router.get(
            '/laporan-detail',
            {
                truck_id: selectedTruck,
                date_from: dateFrom,
                date_to: dateTo,
                tab: activeTab,
            },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setIsRefreshing(false),
            }
        );
    };

    const handlePrint = () => {
        window.print();
    };

    // Filter playlog items by search query
    const filteredPlaylogRecords = (playlogData?.records || []).filter(item => {
        if (!searchMateri) return true;
        const name = (item.materialName || item.media_name || '').toLowerCase();
        return name.includes(searchMateri.toLowerCase());
    });

    const trafficSummary = trafficData?.summary || {
        total_motorcycles: 1240,
        total_cars: 842,
        total_pedestrians: 460,
        total_buses: 118,
        grand_total_traffic: 2660,
    };

    const hourlyTraffic = trafficData?.hourly || [];
    const maxHourlyTotal = Math.max(...hourlyTraffic.map(h => h.total), 1);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-800">
            <Head title="Laporan Detail - LED-FLX Fleet & CCTV" />

            {/* Sidebar Navigation */}
            <Sidebar activeMenu="laporan" />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Navbar title="Laporan Detail Komprehensif" />

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
                    {/* FILTER TOOLBAR */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                        <form onSubmit={handleFilterApply} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Unit Armada Truk
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedTruck}
                                        onChange={(e) => setSelectedTruck(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                                    >
                                        {trucks.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Dari Tanggal
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                                    />
                                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Sampai Tanggal
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                                    />
                                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isRefreshing}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    Terapkan Filter
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* NAVIGATION TABS & EXPORT ACTIONS */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-1">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                                    activeTab === 'overview'
                                        ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
                                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                                }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Ringkasan Eksekutif
                            </button>
                            <button
                                onClick={() => setActiveTab('traffic')}
                                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                                    activeTab === 'traffic'
                                        ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
                                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                                }`}
                            >
                                <BarChart3 className="w-4 h-4" />
                                AI Traffic Analytics
                            </button>
                            <button
                                onClick={() => setActiveTab('playlog')}
                                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                                    activeTab === 'playlog'
                                        ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
                                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                                }`}
                            >
                                <ListMusic className="w-4 h-4" />
                                Log Pemutaran Iklan
                            </button>
                            <button
                                onClick={() => setActiveTab('gps')}
                                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                                    activeTab === 'gps'
                                        ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
                                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                                }`}
                            >
                                <Navigation className="w-4 h-4" />
                                Laporan Rute & GPS
                            </button>
                        </div>

                        {/* Export Buttons per active tab */}
                        <div className="flex items-center gap-2 mb-2 sm:mb-0 shrink-0">
                            <button
                                type="button"
                                onClick={(e) => handleDownload('PDF', e)}
                                disabled={downloadState.isDownloading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-xs disabled:opacity-50"
                                title="Unduh laporan tab ini dalam format PDF"
                            >
                                <Download className="w-3.5 h-3.5 text-red-500" />
                                Unduh PDF
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleDownload('Excel', e)}
                                disabled={downloadState.isDownloading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition shadow-xs disabled:opacity-50"
                                title="Unduh data tab ini dalam format CSV / Excel"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                Ekspor Excel
                            </button>
                        </div>
                    </div>

                    {/* REUSABLE DOWNLOAD PROGRESS BAR COMPONENT */}
                    <DownloadProgressBar
                        isOpen={downloadState.isDownloading}
                        type={downloadState.type}
                        subtitle={`TAB: ${activeTab.toUpperCase()}`}
                        progress={downloadState.progress}
                        message={downloadState.message}
                    />

                    {/* TAB CONTENT: 1. OVERVIEW */}
                    {activeTab === 'overview' && (
                        isRefreshing ? (
                            <SkeletonReportOverview />
                        ) : (
                        <div className="space-y-6">
                            {/* KPI Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Penayangan</p>
                                        <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                                            {Number(summaryKPI.total_plays || 0).toLocaleString('id-ID')}
                                            <span className="text-xs font-normal text-slate-500 ml-1">Spot</span>
                                        </p>
                                        <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> 100% Sesuai Jadwal
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                                        <Play className="w-5 h-5" />
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Durasi Tayang</p>
                                        <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                                            {summaryKPI.total_play_hours || '0'}
                                            <span className="text-xs font-normal text-slate-500 ml-1">Jam</span>
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-1">Operasional Aktif</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jarak Tempuh Armada</p>
                                        <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                                            {summaryKPI.total_distance_km || '0'}
                                            <span className="text-xs font-normal text-slate-500 ml-1">KM</span>
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-1">Akumulasi Foxlogger</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                                        <Navigation className="w-5 h-5" />
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimasi AI Traffic Reach</p>
                                        <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                                            {Number(summaryKPI.total_traffic_reach || 0).toLocaleString('id-ID')}
                                            <span className="text-xs font-normal text-slate-500 ml-1">Target</span>
                                        </p>
                                        <p className="text-[11px] text-blue-600 font-medium mt-1">Sensor Holowits NVR</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                                        <Eye className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>

                            {/* Two-Column Cards: Top Campaign Performance & Status Summary */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Top Campaign Table */}
                                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm">Performa Kampanye Iklan Utama</h3>
                                            <p className="text-xs text-slate-500">Materi dengan frekuensi tayang dan jangkauan tertinggi</p>
                                        </div>
                                        <button
                                            onClick={() => setActiveTab('playlog')}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                                        >
                                            Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                                                    <th className="py-2.5 px-3">Nama Materi & Brand</th>
                                                    <th className="py-2.5 px-3">Durasi</th>
                                                    <th className="py-2.5 px-3 text-center">Tayang</th>
                                                    <th className="py-2.5 px-3 text-right">Est. Reach</th>
                                                    <th className="py-2.5 px-3 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                                {(playlogData.topCampaigns || []).map((camp, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                                                        <td className="py-3 px-3">
                                                            <div className="font-bold text-slate-900">{camp.brand}</div>
                                                            <div className="text-[11px] text-slate-500 font-mono">{camp.name}</div>
                                                        </td>
                                                        <td className="py-3 px-3 font-mono">{camp.duration}</td>
                                                        <td className="py-3 px-3 text-center font-bold font-mono text-slate-900">
                                                            {camp.plays}x
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-bold text-blue-600 font-mono">
                                                            {camp.reach}
                                                        </td>
                                                        <td className="py-3 px-3 text-right">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                {camp.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Fleet Status & Efficiency Card */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">Status Armada & Utilisasi</h3>
                                        <p className="text-xs text-slate-500 mb-4">Kesiapan operasional LED Truck</p>

                                        <div className="space-y-4">
                                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                                                    <span>Truk LED 01 (Giga 01)</span>
                                                    <span className="text-emerald-600 flex items-center gap-1 font-mono">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> 98.8%
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500">Plat: B 9731 JXS | Rute: Sudirman - Thamrin</div>
                                            </div>

                                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                                                    <span>Truk LED 02 (Giga 02)</span>
                                                    <span className="text-emerald-600 flex items-center gap-1 font-mono">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> 98.1%
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500">Plat: B 9729 JXS | Rute: Gatot Subroto - Kuningan</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Tingkat Utilisasi Total</span>
                                        <span className="font-extrabold text-slate-900 font-mono">
                                            {summaryKPI.operational_efficiency || '98.4%'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )
                    )}

                    {/* TAB CONTENT: 2. TRAFFIC ANALYTICS */}
                    {activeTab === 'traffic' && (
                        isRefreshing ? (
                            <SkeletonReportTraffic />
                        ) : (
                        <div className="space-y-6">
                            {/* Summary Bar Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Sepeda Motor</span>
                                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                                            <Gauge className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-2xl font-black text-amber-600 font-mono">
                                            {trafficSummary.total_motorcycles ?? 0}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">Unit terdeteksi NVR</div>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Mobil Pribadi</span>
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                                            <Car className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-2xl font-black text-blue-600 font-mono">
                                            {trafficSummary.total_cars ?? 0}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">Kendaraan roda 4</div>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Pejalan Kaki</span>
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                                            <Users className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-2xl font-black text-emerald-600 font-mono">
                                            {trafficSummary.total_pedestrians ?? 0}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">Orang / Audiens</div>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Bus & Truk</span>
                                        <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                                            <Bus className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-2xl font-black text-purple-600 font-mono">
                                            {trafficSummary.total_buses ?? 0}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">Kendaraan besar</div>
                                    </div>
                                </div>

                                <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Traffic</span>
                                        <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-2xl font-black text-cyan-700 font-mono">
                                            {trafficSummary.grand_total_traffic ?? 0}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">Akumulasi AI Camera</div>
                                    </div>
                                </div>
                            </div>

                            {/* Status Banner when traffic is 0 */}
                            {(trafficSummary.grand_total_traffic ?? 0) === 0 && (
                                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900">
                                    <div className="p-1 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-blue-950">Sensor Kamera Pintar Siap Merekam</div>
                                        <div className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                                            Belum ada pergerakan lalu lintas yang terhitung pada rentang waktu ini, atau kamera armada sedang dalam posisi istirahat / standby. Data akan terbarui secara otomatis saat armada mulai beroperasi di jalan.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Hourly Traffic Distribution Visualizer */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">Distribusi Traffic per Jam (Peak Hours)</h3>
                                        <p className="text-xs text-slate-500">Estimasi kepadatan audiens di sepanjang rute penayangan</p>
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono font-medium">
                                        Puncak: 17:00 - 18:00 WIB
                                    </div>
                                </div>

                                {/* Bar Chart */}
                                <div className="space-y-3">
                                    {hourlyTraffic.map((item, idx) => {
                                        const pct = Math.round((item.total / maxHourlyTotal) * 100);
                                        return (
                                            <div key={idx} className="flex items-center gap-3 text-xs">
                                                <span className="w-12 font-mono text-slate-500 shrink-0">{item.time}</span>
                                                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden flex">
                                                    <div
                                                        style={{ width: `${(item.motorcycles / item.total) * pct}%` }}
                                                        className="bg-amber-400 h-full"
                                                        title={`Motor: ${item.motorcycles}`}
                                                    />
                                                    <div
                                                        style={{ width: `${(item.cars / item.total) * pct}%` }}
                                                        className="bg-blue-500 h-full"
                                                        title={`Mobil: ${item.cars}`}
                                                    />
                                                    <div
                                                        style={{ width: `${(item.pedestrians / item.total) * pct}%` }}
                                                        className="bg-emerald-500 h-full"
                                                        title={`Pejalan Kaki: ${item.pedestrians}`}
                                                    />
                                                    <div
                                                        style={{ width: `${(item.buses / item.total) * pct}%` }}
                                                        className="bg-purple-500 h-full"
                                                        title={`Bus: ${item.buses}`}
                                                    />
                                                </div>
                                                <span className="w-12 text-right font-mono font-bold text-slate-800 shrink-0">
                                                    {item.total}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Motor
                                    </span>
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Mobil
                                    </span>
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Pejalan Kaki
                                    </span>
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" /> Bus & Truk
                                    </span>
                                </div>
                            </div>
                        </div>
                        )
                    )}

                    {/* TAB CONTENT: 3. PLAYLOG IKLAN */}
                    {activeTab === 'playlog' && (
                        isRefreshing ? (
                            <SkeletonPlaylogTable />
                        ) : (
                        <div className="space-y-6">
                            {/* Search & Filter Bar */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="relative flex-1 max-w-md">
                                    <input
                                        type="text"
                                        placeholder="Cari materi iklan atau file..."
                                        value={searchMateri}
                                        onChange={(e) => setSearchMateri(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                                    />
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                </div>

                                <div className="text-xs text-slate-500 font-mono">
                                    Menampilkan {filteredPlaylogRecords.length} riwayat tayang
                                </div>
                            </div>

                            {/* Table */}
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                                            <tr>
                                                <th className="py-3 px-4">No</th>
                                                <th className="py-3 px-4">Waktu Pemutaran</th>
                                                <th className="py-3 px-4">Nama Materi / Iklan</th>
                                                <th className="py-3 px-4">Durasi</th>
                                                <th className="py-3 px-4">Unit Truk</th>
                                                <th className="py-3 px-4 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {filteredPlaylogRecords.length > 0 ? (
                                                filteredPlaylogRecords.map((item, index) => (
                                                    <tr key={index} className="hover:bg-slate-50 transition">
                                                        <td className="py-3 px-4 font-mono text-slate-400">{index + 1}</td>
                                                        <td className="py-3 px-4 font-mono text-slate-600">
                                                            {item.stempelWaktu || item.playTime || item.startTime || '-'}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="font-bold text-slate-900">
                                                                {item.materi || item.materialName || item.media_name || 'Materi Tayang'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-mono">
                                                                {item.klien || `ID: ${item.id || item.materialId || '-'}`}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 font-mono font-medium">
                                                            {item.durasi || item.duration || 30}s
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-600">
                                                            <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                                                                <Truck className="w-3.5 h-3.5 text-slate-400" />
                                                                {item.truckName || 'Truk LED 01'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 className="w-3 h-3" /> {item.status || 'Sukses'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-8 text-slate-400">
                                                        Tidak ada rekaman playlog ditemukan untuk filter ini.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        )
                    )}

                    {/* TAB CONTENT: 4. LAPORAN RUTE & GPS */}
                    {activeTab === 'gps' && (
                        isRefreshing ? (
                            <SkeletonReportGps />
                        ) : (
                        <div className="space-y-6">
                            {/* GPS Telemetry Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Jarak Tempuh</span>
                                    <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                                        {summaryKPI.total_distance_km || '142.6'} <span className="text-xs font-normal text-slate-500">KM</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">Total rute kampanye</div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Kecepatan Rata-rata</span>
                                    <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                                        {gpsData.stats?.avg_speed || '24.5 km/jam'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">Kecepatan jelajah LED</div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Jam Nyala Mesin (Engine)</span>
                                    <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                                        {gpsData.stats?.engine_hours || '118 Jam'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">Durasi generator & truk</div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Titik Singgah / Idle</span>
                                    <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                                        {gpsData.stats?.idle_time || '14 Jam'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">Stationary display spot</div>
                                </div>
                            </div>

                            {/* Position Summary Table */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">Status Posisi Terkini Armada</h3>
                                        <p className="text-xs text-slate-500">Koordinat terakhir diterima dari perangkat pelacak GPS</p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                                                <th className="py-2.5 px-3">Unit Armada</th>
                                                <th className="py-2.5 px-3">IMEI Tracker</th>
                                                <th className="py-2.5 px-3">Koordinat Terakhir</th>
                                                <th className="py-2.5 px-3">Kecepatan</th>
                                                <th className="py-2.5 px-3 text-right">Status Mesin</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {(gpsData.positions || []).map((pos, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition">
                                                    <td className="py-3 px-3">
                                                        <div className="font-bold text-slate-900">{pos.device_name || `Armada ${idx + 1}`}</div>
                                                        <div className="text-[10px] text-slate-500">Pelacak Pintar</div>
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-slate-600">{pos.imei || '-'}</td>
                                                    <td className="py-3 px-3 font-mono text-slate-800">
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin className="w-3.5 h-3.5 text-red-500" />
                                                            {pos.lat}, {pos.lng}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{pos.speed || '0 km/h'}</td>
                                                    <td className="py-3 px-3 text-right">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <Zap className="w-3 h-3" /> {pos.status || 'Engine ON'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 5-Minute Interval Checkpoints Grouped By Date */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-6">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Riwayat Checkpoint Perjalanan (Interval 1 Menit)</h3>
                                    <p className="text-xs text-slate-500">Log titik jelajah armada yang dikelompokkan berdasarkan tanggal</p>
                                </div>

                                {(gpsData.groupedLogs && gpsData.groupedLogs.length > 0) ? (
                                    gpsData.groupedLogs.map((group, gIdx) => (
                                        <div key={gIdx} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-blue-600" />
                                                    <span className="font-bold text-xs text-slate-900">{group.formatted_date}</span>
                                                    <span className="text-[10px] text-slate-500 font-mono">({group.date})</span>
                                                </div>
                                                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                                                    {group.logs.length} Checkpoint (1m)
                                                </span>
                                            </div>

                                            <div className="overflow-x-auto max-h-96">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-white border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px] tracking-wider sticky top-0">
                                                        <tr>
                                                            <th className="py-2.5 px-4">Waktu</th>
                                                            <th className="py-2.5 px-4">Armada</th>
                                                            <th className="py-2.5 px-4">Kecepatan</th>
                                                            <th className="py-2.5 px-4">Lokasi / Alamat</th>
                                                            <th className="py-2.5 px-4 text-right">Status Operasional</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                                        {group.logs.map((log, lIdx) => (
                                                            <tr key={lIdx} className="hover:bg-slate-50 transition">
                                                                <td className="py-2.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                                    {log.time}
                                                                </td>
                                                                <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                                                                    {log.truck_name}
                                                                </td>
                                                                <td className="py-2.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                                    {log.speed}
                                                                </td>
                                                                <td className="py-2.5 px-4 text-xs text-slate-700">
                                                                    <div className="flex items-start gap-1.5">
                                                                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                                                                        <span className="leading-snug">{log.address}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                        log.is_moving
                                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                            : (log.status.includes('Mesin ON') || log.status.includes('Standby')
                                                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                                : 'bg-rose-50 text-rose-700 border border-rose-200')
                                                                    }`}>
                                                                        {log.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                        Belum ada riwayat pergerakan GPS tercatat pada rentang filter tanggal yang dipilih.
                                    </div>
                                )}
                            </div>
                        </div>
                        )
                    )}
                </main>
            </div>
        </div>
    );
}
