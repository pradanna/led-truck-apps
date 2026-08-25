import React from 'react';
import { Play, Clock, LayoutGrid, AlertCircle } from 'lucide-react';

export function PlaylistItemCard({ item, onTriggerPlay }) {
    // Materi aktif di antrean videotron default-nya adalah SEDANG TAYANG (auto-looping)
    const isPlaying = item.status?.toUpperCase() === 'PLAYING' || item.status?.toUpperCase() === 'ACTIVE' || (!item.status && item.onlineStatus);

    const getStatusBadge = () => {
        if (isPlaying) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider bg-emerald-100 text-emerald-800 uppercase shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    SEDANG TAYANG
                </span>
            );
        }

        switch (item.status?.toUpperCase()) {
            case 'SCHEDULED':
                return (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider bg-purple-100 text-purple-700 uppercase shrink-0">
                        TERJADWAL
                    </span>
                );
            case 'OFFLINE':
                return (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider bg-slate-100 text-slate-500 uppercase shrink-0">
                        STANDBY
                    </span>
                );
            case 'PAUSED':
            default:
                return (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider bg-slate-200 text-slate-600 uppercase shrink-0">
                        JEDA
                    </span>
                );
        }
    };

    // Format display ID (truncate long UUIDs gracefully)
    const displayId = item.id && item.id.length > 12 ? `${item.id.slice(0, 8)}...` : item.id;

    return (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
            <div>
                {/* Header Badge & Truncated ID */}
                <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                        title={item.id}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[11px] font-bold rounded truncate max-w-[140px]"
                    >
                        {displayId}
                    </span>
                    {getStatusBadge()}
                </div>

                {/* Cover Preview (or fallback icon) */}
                <div className="relative w-full h-32 rounded-xl overflow-hidden mb-3 bg-slate-800 flex items-center justify-center">
                    {item.thumbnail ? (
                        <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-center p-3">
                            <span className="text-2xl block mb-1">🎬</span>
                            <span className="text-[10px] text-slate-400 font-mono">VNNOX Media Asset</span>
                        </div>
                    )}
                </div>

                {/* Title & Client */}
                <h4 className="font-bold text-slate-900 text-sm line-clamp-1" title={item.title}>
                    {item.title}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 font-medium truncate" title={item.client}>
                    {item.client}
                </p>

                {/* Frequency / Mode */}
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-3 pt-2.5 border-t border-slate-100 font-semibold">
                    <span className="inline-flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg text-[11px] text-slate-600">
                        {item.frequency || 'Auto-Looping Playlist'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function PlaylistGrid({ data, onTriggerPlay }) {
    const items = data?.items || [];
    const isSuccess = data?.success;
    const errorMessage = data?.message;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-base">Playlist Antrean Materi LED</h3>
                </div>
                {isSuccess && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        VNNOX API Active ({items.length} Perangkat)
                    </span>
                )}
            </div>

            {!isSuccess ? (
                /* ERROR STATE DISPLAY */
                <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="w-8 h-8 text-amber-600 mb-2" />
                    <h4 className="font-bold text-sm text-amber-900 mb-1">Gagal Mengambil Data Playlist VNNOX API</h4>
                    <p className="text-xs text-amber-700 max-w-md font-mono bg-white/60 p-2.5 rounded-lg border border-amber-200/60 mb-3">
                        {errorMessage || 'Respons API tidak berhasil atau kredensial belum valid.'}
                    </p>
                    <p className="text-xs text-amber-800 font-medium">
                        Mohon pastikan <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VNNOX_APP_KEY</code> dan <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VNNOX_APP_SECRET</code> pada file <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code> sudah terisi dengan benar.
                    </p>
                </div>
            ) : items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {items.map((item) => (
                        <PlaylistItemCard
                            key={item.id}
                            item={item}
                            onTriggerPlay={onTriggerPlay}
                        />
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-slate-400 font-medium text-xs">
                    Belum ada antrean materi iklan yang terdaftar di akun VNNOX ini.
                </div>
            )}
        </div>
    );
}
