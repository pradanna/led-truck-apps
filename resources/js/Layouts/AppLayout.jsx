import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';

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

                {/* SLIM ACCENT PROGRESS BAR AT TOP DURING TRANSITIONS */}
                {isPageNavigating && (
                    <div className="absolute top-0 inset-x-0 h-1 z-50 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 animate-pulse rounded-full" />
                    </div>
                )}

                {/* NESTED PAGE CONTENT BODY (Each page renders its own local skeletons) */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
