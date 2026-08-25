import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { Key, CheckCircle2 } from 'lucide-react';
import AppLayout from '../Layouts/AppLayout';
import PlaylogBannerHeader from '../Components/Playlog/PlaylogBannerHeader';
import PlaylistGrid from '../Components/Playlog/PlaylistGrid';
import PlaylogRecordsTable from '../Components/Playlog/PlaylogRecordsTable';
import { 
  SkeletonPlaylistGrid, 
  SkeletonPlaylogTable 
} from '../Components/DashboardSkeleton';
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
    const [isLoadingLive, setIsLoadingLive] = useState(!playlistData?.items?.length);

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

    const handleExportExcel = () => {
        const truckId = truckInfo?.id || 'truck_1';
        window.location.href = `/api/report/export-excel?tab=playlog&truck_id=${truckId}&date_from=${new Date().toISOString().split('T')[0]}&date_to=${new Date().toISOString().split('T')[0]}`;
    };

    const handleExportPdf = () => {
        const truckId = truckInfo?.id || 'truck_1';
        window.location.href = `/api/report/export-pdf?tab=playlog&truck_id=${truckId}&date_from=${new Date().toISOString().split('T')[0]}&date_to=${new Date().toISOString().split('T')[0]}`;
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
                        Videotron Aktif
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Videotron Standby
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

            {/* Top Banner Section */}
            <PlaylogBannerHeader selectedTruck={truckInfo?.id || 'truck_1'} />

            {/* Main Section: Playlist Antrean Materi LED (Full Width) */}
            <div className="space-y-6">
                <div>
                    {isLoadingLive && !currentPlaylistData?.items?.length ? (
                        <SkeletonPlaylistGrid />
                    ) : (
                        <PlaylistGrid
                            data={currentPlaylistData}
                            onTriggerPlay={isAdmin ? handleTriggerPlay : null}
                        />
                    )}
                </div>

                {/* Log Aktivitas Penayangan Detil (Playlog Records Table) */}
                <div>
                    {isLoadingLive && !currentPlaylogData?.records?.length ? (
                        <SkeletonPlaylogTable />
                    ) : (
                        <PlaylogRecordsTable
                            data={currentPlaylogData}
                            onExportExcel={handleExportExcel}
                            onExportPdf={handleExportPdf}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
