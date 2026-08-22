import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ 
    activeMenu = 'dashboard', 
    title = 'LED-FLX Fleet Control System', 
    subtitle = '', 
    statusBadge = null, 
    children 
}) {
    const [isPageNavigating, setIsPageNavigating] = useState(false);

    useEffect(() => {
        const removeStart = router.on('start', () => setIsPageNavigating(true));
        const removeFinish = router.on('finish', () => setIsPageNavigating(false));

        return () => {
            removeStart();
            removeFinish();
        };
    }, []);

    return (
        <div className="flex h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden">
            {/* 1. PERMANENT SHARED SIDEBAR - NEVER UNMOUNTS */}
            <Sidebar activeMenu={activeMenu} />

            {/* 2. MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100 relative">
                {/* SHARED TOP NAVBAR */}
                <Navbar 
                    title={title} 
                    subtitle={subtitle} 
                    statusBadge={statusBadge} 
                />

                {/* PROGRESS BAR AT TOP OF CONTENT AREA */}
                {isPageNavigating && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-blue-600 z-50 animate-pulse"></div>
                )}

                {/* NESTED PAGE CONTENT BODY WITH LOADING OVERLAY */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6 relative">
                    {isPageNavigating && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-40 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
                            <div className="p-4 rounded-2xl bg-white shadow-xl border border-slate-200/90 flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                <span className="text-xs font-extrabold text-slate-800 tracking-wide">
                                    Mohon tunggu sebentar...
                                </span>
                            </div>
                        </div>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
}
