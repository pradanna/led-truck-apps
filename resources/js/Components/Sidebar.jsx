import React, { useState, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    LayoutDashboard,
    Video,
    Navigation,
    ListMusic,
    FolderKanban,
    BarChart3,
    FileSpreadsheet,
    Truck,
    Radio,
    Settings,
    Shield,
    LogOut
} from 'lucide-react';

export default function Sidebar({ activeMenu = 'dashboard' }) {
    const { auth } = usePage().props;
    const user = auth?.user || { role: 'admin', isAdmin: true };
    const isAdmin = user.isAdmin ?? (user.role === 'admin');

    // Optimistic active menu state: updates immediately on click
    const [optimisticActiveMenu, setOptimisticActiveMenu] = useState(activeMenu);

    useEffect(() => {
        setOptimisticActiveMenu(activeMenu);
    }, [activeMenu]);

    const handleLogout = (e) => {
        if (e) e.preventDefault();
        router.post('/logout', {}, {
            onSuccess: () => {
                window.location.href = '/login';
            },
            onError: () => {
                window.location.href = '/login';
            },
            onFinish: () => {
                window.location.href = '/login';
            }
        });
    };

    const allMenuItems = [
        {
            id: 'dashboard',
            label: 'Dashboard Utama',
            icon: LayoutDashboard,
            href: '/dashboard',
            adminOnly: false,
        },
        {
            id: 'cctv',
            label: 'Live CCTV Monitoring',
            icon: Video,
            href: '/cctv-monitoring',
            adminOnly: false,
        },
        {
            id: 'gps',
            label: 'GPS Tracking',
            icon: Navigation,
            href: '/gps-tracking',
            adminOnly: false,
        },
        {
            id: 'playlog',
            label: 'Playlog & Playlist',
            icon: ListMusic,
            href: '/playlog',
            adminOnly: false,
        },
        {
            id: 'kampanye',
            label: 'Dokumentasi Kampanye',
            icon: FolderKanban,
            href: '/campaign-documentation',
            adminOnly: false,
        },
        {
            id: 'laporan',
            label: 'Laporan Detail',
            icon: FileSpreadsheet,
            href: '/laporan-detail',
            adminOnly: false,
        },
        {
            id: 'settings',
            label: 'Pengaturan Akun',
            icon: Settings,
            href: '/settings',
            adminOnly: true,
        },
    ];

    // Filter menu items based on role
    const menuItems = allMenuItems.filter(item => !item.adminOnly || isAdmin);

    return (
        <aside className="w-64 bg-white text-slate-700 flex flex-col justify-between shrink-0 border-r border-slate-200 min-h-screen select-none z-20 shadow-xs">
            <div className="flex-1 overflow-y-auto">
                {/* Brand Logo & Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-center">
                    <img
                        src="/images/local/logo-yousee-panjang.png"
                        alt="Yousee Logo"
                        className="h-10 w-auto max-w-[200px] object-contain"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/local/logo-yousee2.png';
                        }}
                    />
                </div>

                {/* Navigation Menu Links */}
                <div className="p-3.5 space-y-1">
                    <div className="px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Menu Navigasi
                    </div>

                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = optimisticActiveMenu === item.id;

                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                preserveState={false}
                                preserveScroll={false}
                                prefetch
                                cacheFor="1m"
                                onClick={() => setOptimisticActiveMenu(item.id)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-bold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Sidebar Footer Account Badge & Logout Button */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between shadow-xs gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isAdmin ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                        <div className="text-xs truncate">
                            <div className="font-bold text-slate-900 truncate">{user.name || 'User'}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                                {isAdmin ? 'Role: Administrator' : `Exp: ${user.expires_at || '-'}`}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        title="Keluar dari Akun (Logout)"
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer shrink-0"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
