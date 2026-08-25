import React from "react";
import { usePage, router } from "@inertiajs/react";
import { Plus, MonitorPlay, Lock, Truck } from "lucide-react";

export default function PlaylogBannerHeader({
    onAddMaterial,
    selectedTruck = "truck_1",
}) {
    const { auth } = usePage().props;
    const isAdmin = auth?.user?.isAdmin ?? auth?.user?.role === "admin";

    const handleSwitchTruck = (truckId) => {
        router.get(
            "/playlog",
            { truck_id: truckId },
            { preserveState: false, preserveScroll: true },
        );
    };

    return (
        <div className="space-y-4 mb-6">
            {/* Truck Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                    type="button"
                    onClick={() => handleSwitchTruck("all")}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${
                        selectedTruck === "all"
                            ? "bg-blue-600 text-white ring-2 ring-blue-600/30"
                            : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                    }`}
                >
                    <Truck className="w-4 h-4" />
                    <span>Semua Armada (Gabungan)</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleSwitchTruck("truck_1")}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${
                        selectedTruck === "truck_1"
                            ? "bg-blue-600 text-white ring-2 ring-blue-600/30"
                            : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                    }`}
                >
                    <Truck className="w-4 h-4" />
                    <span>Truk LED 01 (B 9731 JXS)</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleSwitchTruck("truck_2")}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${
                        selectedTruck === "truck_2"
                            ? "bg-blue-600 text-white ring-2 ring-blue-600/30"
                            : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                    }`}
                >
                    <Truck className="w-4 h-4" />
                    <span>Truk LED 02 (B 9729 JXS)</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 mt-0.5">
                        <MonitorPlay className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Sistem Playlog Videotron{" "}
                            {selectedTruck === "truck_2"
                                ? "- Truk LED 02"
                                : "- Truk LED 01"}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Pengaturan daftar putar materi iklan, durasi tayang,
                            frekuensi harian, serta visualisasi log terperinci.
                        </p>
                    </div>
                </div>

                {/* Tombol Tambah Materi di-hide sementara sesuai permintaan */}
            </div>
        </div>
    );
}
