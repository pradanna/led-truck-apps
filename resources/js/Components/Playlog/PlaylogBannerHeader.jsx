import React from 'react';
import { usePage } from '@inertiajs/react';
import { Plus, MonitorPlay, Lock } from 'lucide-react';

export default function PlaylogBannerHeader({ onAddMaterial }) {
    const { auth } = usePage().props;
    const isAdmin = auth?.user?.isAdmin ?? (auth?.user?.role === 'admin');

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 mt-0.5">
                    <MonitorPlay className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Sistem Playlog & Novastar Videotron
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Pengaturan daftar putar materi iklan, durasi tayang, frekuensi harian, serta visualisasi log terperinci.
                    </p>
                </div>
            </div>

            {isAdmin ? (
                <button
                    onClick={onAddMaterial}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
                >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Tambah Materi Baru</span>
                </button>
            ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 text-xs font-semibold rounded-xl border border-slate-200">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Mode Lihat (Client View Only)</span>
                </div>
            )}
        </div>
    );
}
