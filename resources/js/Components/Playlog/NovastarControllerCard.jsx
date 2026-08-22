import React from 'react';
import { Cpu, AlertTriangle } from 'lucide-react';

export default function NovastarControllerCard({ status }) {
    const isSuccess = status?.success;
    const errorMessage = status?.message;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-full">
            <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-purple-600" />
                        <h3 className="font-bold text-slate-800 text-base">Novastar Videotron Controller</h3>
                    </div>
                </div>

                {!isSuccess ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                        <div className="flex items-center gap-2 font-bold mb-1 text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>VNNOX API Disconnected</span>
                        </div>
                        <p className="font-mono text-[11px] text-amber-700 leading-relaxed">
                            {errorMessage || 'Tidak dapat terhubung ke hardware controller.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center py-1.5">
                            <span className="text-slate-500 font-medium">Processor Chip</span>
                            <span className="font-bold text-slate-800 tracking-wide">{status.processorChip}</span>
                        </div>

                        <div className="flex justify-between items-center py-1.5 border-t border-slate-50">
                            <span className="text-slate-500 font-medium">LED Refresh Rate</span>
                            <span className="font-bold text-blue-600">{status.refreshRate}</span>
                        </div>

                        <div className="flex justify-between items-center py-1.5 border-t border-slate-50">
                            <span className="text-slate-500 font-medium">Pixel Pitch Panel</span>
                            <span className="font-bold text-slate-800">{status.pixelPitch}</span>
                        </div>

                        <div className="flex justify-between items-center py-1.5 border-t border-slate-50">
                            <span className="text-slate-500 font-medium">Link Receiving Cards</span>
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                OK ({status.receivingCards?.connected || 0}/{status.receivingCards?.total || 0} Connected)
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-1.5 border-t border-slate-50">
                            <span className="text-slate-500 font-medium">Kesehatan Fan Cooler</span>
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                <span className="text-emerald-500">💚</span>
                                {status.fanCoolerHealth}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
