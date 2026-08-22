import React from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';

export default function DownloadProgressBar({
    isOpen = false,
    type = 'PDF', // 'PDF' | 'Excel' | 'File'
    subtitle = '',
    progress = 0,
    message = ''
}) {
    if (!isOpen) return null;

    const isPdf = type.toUpperCase() === 'PDF';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full space-y-4">
                <div className="flex items-center gap-3">
                    <div
                        className={`p-2.5 rounded-xl ${
                            isPdf
                                ? 'bg-red-50 text-red-600 border border-red-100'
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}
                    >
                        {isPdf ? (
                            <Download className="w-5 h-5 animate-bounce" />
                        ) : (
                            <FileSpreadsheet className="w-5 h-5 animate-bounce" />
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                            Mengunduh Dokumen {type}
                        </h4>
                        {subtitle && (
                            <p className="text-[11px] text-slate-500 font-mono">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Proses Kompilasi</span>
                        <span className="font-mono text-blue-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                        <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <p className="text-xs text-slate-600 text-center animate-pulse">
                    {message}
                </p>
            </div>
        </div>
    );
}
