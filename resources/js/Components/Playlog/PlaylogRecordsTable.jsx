import React, { useState } from 'react';
import { Download, Search, CheckCircle2, AlertTriangle, XCircle, FileText, Info } from 'lucide-react';

export default function PlaylogRecordsTable({ data, onExportCsv }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const records = data?.records || [];
    const isSuccess = data?.success;
    const errorMessage = data?.message;
    const notice = data?.notice;

    const filteredRecords = records.filter((rec) => {
        const matchesSearch =
            rec.materi.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rec.klien.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rec.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === 'ALL' || rec.status.toUpperCase() === statusFilter.toUpperCase();

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status) => {
        switch (status.toLowerCase()) {
            case 'success':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Success
                    </span>
                );
            case 'warning':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Warning
                    </span>
                );
            case 'error':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" />
                        Error
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mt-6">
            {/* Table Header & Download Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
                <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Log Aktivitas Penayangan Detil (Playlog Records)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Histori pemutaran otomatis dan sinkronisasi GPS Novastar yang terdokumentasi via VNNOX API.
                    </p>
                </div>

                <button
                    onClick={onExportCsv}
                    disabled={!isSuccess || records.length === 0}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border shadow-sm transition-all shrink-0 cursor-pointer ${
                        !isSuccess || records.length === 0
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none'
                            : 'border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700'
                    }`}
                >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Unduh Laporan Log (.CSV)</span>
                </button>
            </div>

            {/* Enterprise Auth Informational Notice Banner if present */}
            {notice && (
                <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-2.5 text-xs">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold">Informasi Akses VNNOX API Log:</span>
                        <p className="text-blue-800 mt-0.5 leading-relaxed">{notice}</p>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
                {/* Search Input */}
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cari materi iklan atau klien..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                        STATUS LOG:
                    </span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                        <option value="ALL">Semua Status Log</option>
                        <option value="SUCCESS">Success Only</option>
                        <option value="WARNING">Warning Only</option>
                        <option value="ERROR">Error Only</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                            <th className="py-3 px-4">ID Log</th>
                            <th className="py-3 px-4">Materi Iklan</th>
                            <th className="py-3 px-4">Klien</th>
                            <th className="py-3 px-4">Stempel Waktu</th>
                            <th className="py-3 px-4 text-center">Durasi (s)</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4">Informasi Sistem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {filteredRecords.length > 0 ? (
                            filteredRecords.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                                        {row.id}
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-slate-900">
                                        {row.materi}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                                        {row.klien}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-500">
                                        {row.stempelWaktu}
                                    </td>
                                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                                        {row.durasi}s
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                        {getStatusBadge(row.status)}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                                        {row.infoSistem}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="py-8 text-center text-slate-400 font-medium">
                                    Belum ada catatan log penayangan dari VNNOX API.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
