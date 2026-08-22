import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import {
  Settings as SettingsIcon,
  Video,
  Radio,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Key,
  Globe,
  Tv,
  Cpu,
  Layers,
  Lock,
  Users,
  UserPlus,
  Calendar,
  Trash2,
  Edit2,
  X,
  Clock
} from 'lucide-react';
import AppLayout from '../Layouts/AppLayout';

export default function Settings({ truckConfigs = {}, globalIntegrations = {}, apiStatus = {}, usersList = [] }) {
  const [activeTab, setActiveTab] = useState('integrations'); // 'integrations', 'nvr', 'users'
  const [configs, setConfigs] = useState(truckConfigs);
  const [selectedTruck, setSelectedTruck] = useState('truck_1');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Global Integrations State (Foxlogger & VnNox)
  const [foxloggerForm, setFoxloggerForm] = useState({
    username: globalIntegrations?.foxlogger?.username || '',
    password: globalIntegrations?.foxlogger?.password || '',
  });

  const [vnnoxForm, setVnnoxForm] = useState({
    base_url: globalIntegrations?.vnnox?.base_url || 'https://openapi-eu.vnnox.com',
    app_key: globalIntegrations?.vnnox?.app_key || '',
    app_secret: globalIntegrations?.vnnox?.app_secret || '',
  });

  const [showFoxPassword, setShowFoxPassword] = useState(false);
  const [showVnnoxSecret, setShowVnnoxSecret] = useState(false);

  // User Management State
  const [users, setUsers] = useState(usersList);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    expires_at: '',
    is_active: true,
  });

  const activeTruck = configs[selectedTruck] || {
    id: selectedTruck,
    name: selectedTruck === 'truck_1' ? 'Truk LED 01' : 'Truk LED 02',
    nvr_ip: '',
    http_port: 443,
    rtsp_port: 554,
    username: 'admin',
    password: '',
  };

  const [formData, setFormData] = useState({
    truck_id: selectedTruck,
    nvr_ip: activeTruck.nvr_ip || '',
    http_port: activeTruck.http_port || 443,
    rtsp_port: activeTruck.rtsp_port || 554,
    username: activeTruck.username || 'admin',
    password: activeTruck.password || '',
  });

  // Switch form values when truck tab changes
  const handleSelectTruck = (truckId) => {
    setSelectedTruck(truckId);
    setSuccessMsg('');
    setErrorMsg('');
    const target = configs[truckId] || {};
    setFormData({
      truck_id: truckId,
      nvr_ip: target.nvr_ip || '',
      http_port: target.http_port || 443,
      rtsp_port: target.rtsp_port || 554,
      username: target.username || 'admin',
      password: target.password || '',
    });
  };

  // Save Foxlogger Credentials
  const handleSaveFoxlogger = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/settings/foxlogger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(foxloggerForm)
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message);
      } else {
        setErrorMsg(json.message || 'Gagal menyimpan kredensial Foxlogger.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan saat menyimpan kredensial Foxlogger.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save VNNOX Credentials
  const handleSaveVnnox = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/settings/vnnox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(vnnoxForm)
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message);
      } else {
        setErrorMsg(json.message || 'Gagal menyimpan kredensial VnNox.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan saat menyimpan kredensial VnNox.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save NVR Settings
  const handleSaveNvr = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/settings/nvr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (json.success) {
        setConfigs(json.configs);
        setSuccessMsg(json.message || 'Pengaturan NVR berhasil disimpan!');
      } else {
        setErrorMsg(json.message || 'Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan saat menghubungi server.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open User Create Modal
  const openCreateUserModal = () => {
    setEditingUserId(null);
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'user',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // default 30 days
      is_active: true,
    });
    setUserModalOpen(true);
  };

  // Open User Edit Modal
  const openEditUserModal = (u) => {
    setEditingUserId(u.id);
    setUserForm({
      name: u.name,
      email: u.email,
      password: '', // optional on edit
      role: u.role,
      expires_at: u.expires_at || '',
      is_active: u.is_active,
    });
    setUserModalOpen(true);
  };

  // Save / Update User
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    const url = editingUserId ? `/api/settings/users/${editingUserId}` : '/api/settings/users';
    const method = editingUserId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(userForm)
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message);
        setUserModalOpen(false);
        // Refresh users list locally
        if (editingUserId) {
          setUsers(users.map(u => u.id === editingUserId ? { ...u, ...userForm, expires_at_human: userForm.expires_at || 'Tanpa Batas' } : u));
        } else if (json.user) {
          setUsers([...users, { ...json.user, expires_at_human: json.user.expires_at || 'Tanpa Batas', is_expired: false }]);
        }
      } else {
        setErrorMsg(json.message || 'Gagal menyimpan data user.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan saat menyimpan user.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun ${userName}?`)) return;

    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message);
        setUsers(users.filter(u => u.id !== userId));
      } else {
        setErrorMsg(json.message || 'Gagal menghapus user.');
      }
    } catch (err) {
      setErrorMsg('Gagal menghapus user.');
    }
  };

  return (
    <AppLayout
      activeMenu="settings"
      title="Pengaturan Sistem Global"
      subtitle="Kelola IP NVR CCTV, Manajemen Akun Pengguna & Masa Berlaku Klien"
      statusBadge={
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
          <SettingsIcon className="w-3.5 h-3.5" />
          ADMINISTRATOR ACCESS
        </span>
      }
    >
      <Head title="Pengaturan Global - LED-FLX Fleet Control" />

      {/* FEEDBACK ALERTS */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB NAVIGATION: INTEGRASI GLOBAL VS NVR SETTINGS VS USER MANAGEMENT */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'integrations'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Kredensial API Eksternal (GPS & Novastar)</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manajemen Pengguna & Masa Berlaku ({users.length})</span>
        </button>
      </div>

      {/* TAB 0: KREDENSIAL API GLOBAL (FOXLOGGER & VNNOX) */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. FOXLOGGER GPS TRACKER FORM */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Akun Foxlogger GPS Tracker</h3>
                  <p className="text-xs text-slate-500">Kredensial sinkronisasi histori rute dan posisi GPS</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                apiStatus?.foxlogger ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {apiStatus?.foxlogger ? 'STATUS: TERHUBUNG' : 'STATUS: OFFLINE'}
              </span>
            </div>

            <form onSubmit={handleSaveFoxlogger} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email / Username Foxlogger
                </label>
                <input
                  type="text"
                  required
                  placeholder="centralledid168@gmail.com"
                  value={foxloggerForm.username}
                  onChange={(e) => setFoxloggerForm({ ...foxloggerForm, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Akun
                </label>
                <div className="relative">
                  <input
                    type={showFoxPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={foxloggerForm.password}
                    onChange={(e) => setFoxloggerForm({ ...foxloggerForm, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFoxPassword(!showFoxPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-semibold"
                  >
                    {showFoxPassword ? 'Tutup' : 'Lihat'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Password disimpan dengan enkripsi aman AES-256 di database
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-emerald-600/30 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Menyimpan & Menguji...' : 'Simpan Kredensial Foxlogger'}
                </button>
              </div>
            </form>
          </div>

          {/* 2. VNNOX PLAYER API FORM */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Novastar / VNNOX Cloud API</h3>
                  <p className="text-xs text-slate-500">Integrasi player materi iklan dan log penayangan</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                apiStatus?.vnnox ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {apiStatus?.vnnox ? 'STATUS: TERHUBUNG' : 'STATUS: BELUM LENGKAP'}
              </span>
            </div>

            <form onSubmit={handleSaveVnnox} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Base URL Endpoint API
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://openapi-eu.vnnox.com"
                  value={vnnoxForm.base_url}
                  onChange={(e) => setVnnoxForm({ ...vnnoxForm, base_url: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  VNNOX App Key
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan VNNOX App Key"
                  value={vnnoxForm.app_key}
                  onChange={(e) => setVnnoxForm({ ...vnnoxForm, app_key: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  VNNOX App Secret
                </label>
                <div className="relative">
                  <input
                    type={showVnnoxSecret ? 'text' : 'password'}
                    required
                    placeholder="Masukkan VNNOX App Secret"
                    value={vnnoxForm.app_secret}
                    onChange={(e) => setVnnoxForm({ ...vnnoxForm, app_secret: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowVnnoxSecret(!showVnnoxSecret)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-semibold"
                  >
                    {showVnnoxSecret ? 'Tutup' : 'Lihat'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Kunci rahasia dienkripsi aman dua arah (Two-Way Encryption)
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-blue-600/30 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Kredensial VNNOX'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: NVR CCTV SETTINGS & API STATUS */}
      {activeTab === 'nvr' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KOLOM KIRI (2 COLS): KONFIGURASI IP PUBLIC NVR CCTV PER TRUK */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Konfigurasi NVR CCTV HOLOWITS</h3>
                    <p className="text-xs text-slate-500">Atur IP Public, Port RTSP, dan Kredensial Kamera per Truk</p>
                  </div>
                </div>
              </div>

              {/* TAB PEMILIHAN TRUK */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pilih Armada Truk
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectTruck('truck_1')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedTruck === 'truck_1'
                        ? 'bg-blue-50 border-blue-300 text-blue-800 ring-2 ring-blue-500/20 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold">Truk LED 01</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-mono font-bold">
                        B 9731 JXS
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5 font-mono">
                      IP: {configs?.truck_1?.nvr_ip || 'Belum Diatur'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTruck('truck_2')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedTruck === 'truck_2'
                        ? 'bg-blue-50 border-blue-300 text-blue-800 ring-2 ring-blue-500/20 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold">Truk LED 02</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-mono font-bold">
                        B 9142 SXZ
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5 font-mono">
                      IP: {configs?.truck_2?.nvr_ip || 'Belum Diatur'}
                    </div>
                  </button>
                </div>
              </div>

              {/* FORM INPUT PENGATURAN NVR */}
              <form onSubmit={handleSaveNvr} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      IP Public NVR / Hostname
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 103.144.175.22"
                        value={formData.nvr_ip}
                        onChange={(e) => setFormData({ ...formData, nvr_ip: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Port RTSP Video
                    </label>
                    <input
                      type="number"
                      value={formData.rtsp_port}
                      onChange={(e) => setFormData({ ...formData, rtsp_port: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Username NVR
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Password NVR
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* INFO CHANNEL MAPPING */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Mapping Saluran Kamera Terpasang:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-900">CH1: Kamera Belakang</div>
                      <div className="text-slate-500">Menghadap Layar LED Truk</div>
                      <div className="font-mono text-blue-600 text-[10px] mt-1 truncate">
                        LiveStream/CH1/main
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-900">CH2: Kamera Depan</div>
                      <div className="text-slate-500">Menghadap Jalan Raya & AI Trafik</div>
                      <div className="font-mono text-blue-600 text-[10px] mt-1 truncate">
                        LiveStream/CH2/main
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-blue-600/30"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Menyimpan & Mengetes...' : 'Simpan Pengaturan NVR'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* KOLOM KANAN (1 COL): STATUS INTEGRASI API GLOBAL */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Status Integrasi API</h3>
                  <p className="text-[11px] text-slate-500">Koneksi gateway eksternal</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {/* Foxlogger GPS API */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-600" />
                      Foxlogger GPS Tracker
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      apiStatus?.foxlogger ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {apiStatus?.foxlogger ? 'TERHUBUNG' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tracking posisi GPS, kecepatan armada, dan histori rute.
                  </div>
                </div>

                {/* Novastar / VNNOX API */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Tv className="w-4 h-4 text-blue-600" />
                      Novastar / VNNOX Cloud
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      apiStatus?.vnnox ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {apiStatus?.vnnox ? 'TERHUBUNG' : 'BELUM DIATUR'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Kontrol controller TU20Pro & logging playlist materi iklan.
                  </div>
                </div>

                {/* HOLOWITS NVR API */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Video className="w-4 h-4 text-indigo-600" />
                      HOLOWITS HWT-NVR800
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      2 UNIT TRUK
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Live CCTV streaming, AI Object Counting, dan PTZ control.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT & ACCOUNT EXPIRATION */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Manajemen Akun Pengguna & Hak Akses
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Admin memiliki hak akses penuh ganti materi & pengaturan, sedangkan User Client hanya memiliki hak View Only dengan masa berlaku.
                </p>
              </div>

              <button
                onClick={openCreateUserModal}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-blue-600/30 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Akun Baru</span>
              </button>
            </div>

            {/* USERS TABLE */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Nama & Email</th>
                    <th className="px-4 py-3.5">Role / Peran</th>
                    <th className="px-4 py-3.5">Masa Berlaku (Expired)</th>
                    <th className="px-4 py-3.5">Status Akun</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-extrabold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.role === 'admin' ? 'Administrator' : 'Client / User'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className={`font-bold ${u.is_expired ? 'text-rose-600' : 'text-slate-800'}`}>
                            {u.expires_at_human || 'Tanpa Batas'}
                          </span>
                        </div>
                        {u.is_expired && (
                          <span className="text-[10px] text-rose-500 font-bold block mt-0.5">
                            (Sudah Kadaluarsa)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {u.is_active ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openEditUserModal(u)}
                          className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          title="Edit Akun"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* USER FORM MODAL */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingUserId ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
                </h3>
              </div>
              <button
                onClick={() => setUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Brand Maju / John Doe"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Pengguna</label>
                <input
                  type="email"
                  required
                  placeholder="klien@brand.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi {editingUserId && <span className="text-slate-400 font-normal">(Kosongkan jika tidak diganti)</span>}
                </label>
                <input
                  type="password"
                  required={!editingUserId}
                  placeholder="••••••••••••"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role / Peran</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="user">Client / User (View Only)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={userForm.is_active ? '1' : '0'}
                    onChange={(e) => setUserForm({ ...userForm, is_active: e.target.value === '1' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Masa Berlaku Akun (Only for role 'user') */}
              {userForm.role === 'user' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Masa Berlaku Akun (Expiration Date)
                  </label>
                  <input
                    type="date"
                    value={userForm.expires_at}
                    onChange={(e) => setUserForm({ ...userForm, expires_at: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Setelah tanggal ini, akun klien akan otomatis tidak bisa login lagi.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm shadow-blue-600/30"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
