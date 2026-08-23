import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import {
  Key,
  X,
  UploadCloud,
  FileVideo,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Tv,
  Clock,
  User,
  Layers,
  Save
} from 'lucide-react';
import AppLayout from '../Layouts/AppLayout';
import PlaylogBannerHeader from '../Components/Playlog/PlaylogBannerHeader';
import PlaylistGrid from '../Components/Playlog/PlaylistGrid';
import NovastarControllerCard from '../Components/Playlog/NovastarControllerCard';
import PlaylogRecordsTable from '../Components/Playlog/PlaylogRecordsTable';
import axios from 'axios';

export default function PlaylogPlaylist({
    selectedTruck = 'truck_1',
    truckInfo,
    playlistData,
    controllerStatus,
    playlogData,
    apiConfigured
}) {
    const { auth } = usePage().props;
    const isAdmin = auth?.user?.isAdmin ?? (auth?.user?.role === 'admin');

    const [currentPlaylistData, setCurrentPlaylistData] = useState(playlistData || { success: false, items: [] });
    const [currentControllerStatus, setCurrentControllerStatus] = useState(controllerStatus || { onlineStatus: false });
    const [currentPlaylogData, setCurrentPlaylogData] = useState(playlogData || { records: [] });
    const [toastMessage, setToastMessage] = useState('');
    const [isLoadingLive, setIsLoadingLive] = useState(false);

    // Background lazy fetch for live VNNOX data with AbortController
    useEffect(() => {
        const controller = new AbortController();
        setIsLoadingLive(true);

        fetch(`/api/vnnox/live-data?truck_id=${selectedTruck}`, { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (data.playlistData) setCurrentPlaylistData(data.playlistData);
                    if (data.controllerStatus) setCurrentControllerStatus(data.controllerStatus);
                    if (data.playlogData) setCurrentPlaylogData(data.playlogData);
                }
            })
            .catch(err => {
                if (err.name !== 'AbortError') {
                    console.error("Playlog live data lazyload:", err);
                }
            })
            .finally(() => setIsLoadingLive(false));

        return () => {
            controller.abort(); // Interupsi dan batalkan request saat pindah menu
        };
    }, [selectedTruck]);

    // Modal Form State Tambah Materi
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        client: '',
        duration: 15,
        frequency: '120x / Hari (Loop 10m)',
        media_type: 'video', // 'video' or 'image'
        file: null,
    });
    const [filePreview, setFilePreview] = useState(null);

    const handleTriggerPlay = async (materialId) => {
        try {
            const response = await axios.post('/api/vnnox/play', { material_id: materialId });
            if (response.data.success) {
                const updatedItems = (currentPlaylistData.items || []).map((item) => {
                    if (item.id === materialId) {
                        return { ...item, status: 'PLAYING' };
                    }
                    if (item.status === 'PLAYING') {
                        return { ...item, status: 'ACTIVE' };
                    }
                    return item;
                });
                setCurrentPlaylistData({ ...currentPlaylistData, items: updatedItems });
                showToast(`Materi ${materialId} berhasil diputar pada Novastar Controller.`);
            }
        } catch (error) {
            showToast('Gagal mengirim perintah pemutaran materi.');
        }
    };

    const handleExportCsv = () => {
        window.location.href = '/api/vnnox/export-logs';
    };

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3500);
    };

    const handleOpenAddModal = () => {
        setModalError('');
        setFormData({
            title: '',
            client: '',
            duration: 15,
            frequency: '120x / Hari (Loop 10m)',
            media_type: 'video',
            file: null,
        });
        setFilePreview(null);
        setIsAddModalOpen(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, file });
            if (file.type.startsWith('image/')) {
                setFilePreview(URL.createObjectURL(file));
            } else {
                setFilePreview(null);
            }
        }
    };

    const handleSubmitNewMaterial = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setModalError('');

        const formPayload = new FormData();
        formPayload.append('title', formData.title);
        formPayload.append('client', formData.client);
        formPayload.append('duration', formData.duration);
        formPayload.append('frequency', formData.frequency);
        formPayload.append('media_type', formData.media_type);
        if (formData.file) {
            formPayload.append('file', formData.file);
        }

        try {
            const response = await axios.post('/api/vnnox/materials', formPayload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                // Prepend new material to playlist UI state
                const newItem = response.data.material;
                const updatedItems = [newItem, ...(currentPlaylistData.items || [])];
                setCurrentPlaylistData({
                    ...currentPlaylistData,
                    items: updatedItems,
                });

                setIsAddModalOpen(false);
                showToast(response.data.message || 'Materi baru berhasil ditambahkan!');
            } else {
                setModalError(response.data.message || 'Gagal menambahkan materi.');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Terjadi kesalahan saat mengunggah materi ke server.';
            setModalError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppLayout
            activeMenu="playlog"
            title="Sistem Playlog & Novastar Videotron"
            subtitle={`${truckInfo?.name || 'LED Truck Giga 01'} (${truckInfo?.plateNumber || 'B 9482 LED'}) - ${truckInfo?.location || 'Bundaran HI'}`}
            statusBadge={
                truckInfo?.isLive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        ONLINE
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200 uppercase tracking-wide">
                        VNNOX API DISCONNECTED
                    </span>
                )
            }
        >
            <Head title="Playlog & Playlist - LED-FLX Fleet Control" />

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Top API Credentials Warning Banner */}
            {!apiConfigured && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-start gap-3 shadow-xs">
                    <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                        <h4 className="font-bold text-sm text-amber-900">Kredensial VNNOX API Belum Terkonfigurasi</h4>
                        <p className="mt-0.5 text-amber-800">
                            Silakan isi variabel <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">VNNOX_APP_KEY</code> dan <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">VNNOX_APP_SECRET</code> pada file <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">.env</code> untuk sinkronisasi controller NovaStar TU20Pro.
                        </p>
                    </div>
                </div>
            )}

            {/* Banner Section with Add Material Button */}
            <PlaylogBannerHeader onAddMaterial={handleOpenAddModal} selectedTruck={truckInfo?.id || 'truck_1'} />

            {/* Grid Row: Playlist (Left 2 cols) & Controller Specs (Right 1 col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <PlaylistGrid
                        data={currentPlaylistData}
                        onTriggerPlay={isAdmin ? handleTriggerPlay : null}
                    />
                </div>
                <div className="lg:col-span-1">
                    <NovastarControllerCard status={currentControllerStatus} />
                </div>
            </div>

            {/* Bottom Section: Playlog Activity Records Table */}
            <PlaylogRecordsTable
                data={currentPlaylogData}
                onExportCsv={handleExportCsv}
            />

            {/* MODAL FORM TAMBAH MATERI BARU (NOVASTAR VNNOX SPEC) */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                    <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                                    <Plus className="w-5 h-5 stroke-[2.5]" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-900 text-base">
                                        Tambah Materi Iklan Videotron
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Format spesifikasi NovaStar TU20Pro / VNNOX Cloud API
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Error Alert inside Modal */}
                        {modalError && (
                            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2.5 shadow-xs">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        {/* Upload Form */}
                        <form onSubmit={handleSubmitNewMaterial} className="space-y-4">
                            {/* Judul Materi Iklan */}
                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Judul / Nama Materi Iklan
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Promo Ramadhan 2026 - Brand X"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:border-blue-500 focus:bg-white focus:outline-none"
                                />
                            </div>

                            {/* Nama Klien / Brand & Tipe Media */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                                        Nama Klien / Brand
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: PT Unilever Indonesia"
                                        value={formData.client}
                                        onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                                        Tipe Format Media
                                    </label>
                                    <select
                                        value={formData.media_type}
                                        onChange={(e) => setFormData({ ...formData, media_type: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
                                    >
                                        <option value="video">Video MP4 / MOV (Rekomendasi H.264)</option>
                                        <option value="image">Gambar Statis PNG / JPG</option>
                                    </select>
                                </div>
                            </div>

                            {/* Durasi & Frekuensi Penayangan */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                                        Durasi Tayang (Detik)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            required
                                            min="5"
                                            max="300"
                                            value={formData.duration}
                                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                                        />
                                        <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">detik</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                                        Frekuensi Penayangan
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.frequency}
                                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                        placeholder="120x / Hari (Loop 10m)"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Upload File Media */}
                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Unggah File Video / Banner Iklan
                                </label>
                                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-center transition-colors bg-slate-50/60 relative">
                                    <input
                                        type="file"
                                        accept="video/mp4,video/quicktime,image/jpeg,image/png"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <UploadCloud className="w-8 h-8 text-blue-500" />
                                        <div className="text-xs font-bold text-slate-800">
                                            {formData.file ? formData.file.name : 'Klik untuk memilih file atau seret file ke sini'}
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            Format didukung: MP4, MOV, JPG, PNG (Resolusi disarankan: 3840x768 px)
                                        </p>
                                    </div>
                                </div>

                                {filePreview && (
                                    <div className="mt-2 p-2 rounded-xl border border-slate-200 bg-white inline-block">
                                        <img src={filePreview} alt="Preview" className="h-20 rounded-lg object-cover" />
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/30 disabled:opacity-60"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSubmitting ? 'Menyimpan & Sinkronisasi...' : 'Simpan & Publikasikan ke Layar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
