import React, { useState, useRef, useEffect } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import { User, LogOut, ChevronDown, ShieldCheck, Clock, Bell, Calendar, UserCheck, Settings } from 'lucide-react';

export default function Navbar({ title, subtitle, statusBadge }) {
    const { auth } = usePage().props;
    const user = auth?.user || { name: 'Super Administrator', email: 'admin@ledflx.com', role: 'admin', isAdmin: true, expires_at: 'Selamanya' };

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'A';
    const isAdmin = user.isAdmin ?? (user.role === 'admin');

    return (
        <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shrink-0 shadow-xs z-30">
            {/* BAGIAN KIRI: Page Title & Context */}
            <div className="flex items-center gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                            {title || 'LED-FLX Fleet Control System'}
                        </h1>
                        {statusBadge}
                    </div>
                    {subtitle && (
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* BAGIAN KANAN: Realtime Clock & User Account Dropdown */}
            <div className="flex items-center gap-5">
                {/* Realtime Operational Badge */}
                <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-slate-500 uppercase font-sans text-[10px] font-bold">LIVE OPS:</span>
                    <span className="font-bold text-slate-800">
                        {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                </div>

                {/* USER ACCOUNT DROPDOWN */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                    >
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full text-white font-extrabold text-sm flex items-center justify-center shadow-xs ${
                            isAdmin ? 'bg-blue-600' : 'bg-emerald-600'
                        }`}>
                            {userInitial}
                        </div>

                        {/* Name & Role */}
                        <div className="text-left hidden sm:block">
                            <span className="block text-xs font-bold text-slate-900 leading-tight">
                                {user.name}
                            </span>
                            <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                {isAdmin ? 'Administrator' : 'Client User'}
                            </span>
                        </div>

                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* DROPDOWN MENU */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            {/* User Header Info */}
                            <div className="px-4 py-2.5 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                        isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {user.role}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">{user.email}</p>
                            </div>

                            {/* Masa Berlaku Akun Badge */}
                            <div className="px-3 py-2">
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-slate-500 font-medium">Masa Berlaku:</span>
                                    </div>
                                    <span className="font-bold text-[11px] text-slate-900 font-mono">
                                        {user.expires_at || 'Selamanya'}
                                    </span>
                                </div>
                            </div>

                            {/* Admin Settings Shortcut */}
                            {isAdmin && (
                                <div className="px-3 pb-1">
                                    <Link
                                        href="/settings"
                                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        <Settings className="w-4 h-4 text-slate-400" />
                                        <span>Pengaturan Akun</span>
                                    </Link>
                                </div>
                            )}

                            {/* Logout Action */}
                            <div className="border-t border-slate-100 pt-1">
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4 text-rose-600" />
                                    <span>Keluar dari Akun (Logout)</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
