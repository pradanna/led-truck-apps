import React, { useState, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Clock,
  Search,
  Calendar,
  Lock,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Save,
  Shield,
  Eye,
  EyeOff,
  Filter,
  Check,
  Power
} from 'lucide-react';
import AppLayout from '../Layouts/AppLayout';

export default function Settings({ usersList = [] }) {
  const { auth } = usePage().props;
  const currentUserId = auth?.user?.id;

  const [users, setUsers] = useState(usersList);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    expires_at: '',
    is_active: true,
  });

  // Calculate quick stats
  const stats = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter((u) => u.role === 'admin').length;
    const activeClients = users.filter((u) => u.role === 'user' && u.is_active && !u.is_expired).length;
    const expiredCount = users.filter((u) => u.is_expired || !u.is_active).length;

    return { total, adminCount, activeClients, expiredCount };
  }, [users]);

  // Filter users based on search query, role, and status
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = u.is_active && !u.is_expired;
      } else if (statusFilter === 'inactive') {
        matchesStatus = !u.is_active;
      } else if (statusFilter === 'expired') {
        matchesStatus = u.is_expired;
      }

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Open Create Modal with default 30-day expiration for clients
  const openCreateUserModal = () => {
    setEditingUserId(null);
    setShowPassword(false);
    const defaultExpire = new Date();
    defaultExpire.setDate(defaultExpire.getDate() + 30);

    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'user',
      expires_at: defaultExpire.toISOString().split('T')[0],
      is_active: true,
    });
    setUserModalOpen(true);
  };

  // Open Edit Modal
  const openEditUserModal = (u) => {
    setEditingUserId(u.id);
    setShowPassword(false);
    setUserForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      expires_at: u.expires_at || '',
      is_active: Boolean(u.is_active),
    });
    setUserModalOpen(true);
  };

  // Helper to set preset expiration dates in modal
  const setExpirationPreset = (days) => {
    if (days === null) {
      setUserForm((prev) => ({ ...prev, expires_at: '' }));
      return;
    }
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    setUserForm((prev) => ({
      ...prev,
      expires_at: targetDate.toISOString().split('T')[0],
    }));
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
          Accept: 'application/json',
          'X-CSRF-TOKEN':
            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify(userForm),
      });

      const json = await res.json();
      if (json.success && json.user) {
        setSuccessMsg(json.message);
        setUserModalOpen(false);

        if (editingUserId) {
          setUsers((prev) =>
            prev.map((u) => (u.id === editingUserId ? json.user : u))
          );
        } else {
          setUsers((prev) => [...prev, json.user]);
        }
      } else {
        setErrorMsg(json.message || 'Gagal menyimpan data pengguna. Periksa data masukan Anda.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kendala saat menghubungi server. Silakan coba kembali.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle user active status quickly
  const handleToggleStatus = async (user) => {
    if (user.id === currentUserId) {
      setErrorMsg('Anda tidak dapat menonaktifkan akun yang sedang digunakan saat ini.');
      return;
    }

    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN':
            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          expires_at: user.expires_at,
          is_active: !user.is_active,
        }),
      });

      const json = await res.json();
      if (json.success && json.user) {
        setSuccessMsg(`Status akun ${user.name} berhasil diubah.`);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? json.user : u))
        );
      } else {
        setErrorMsg(json.message || 'Gagal mengubah status pengguna.');
      }
    } catch (err) {
      setErrorMsg('Gagal memperbarui status akun.');
    }
  };

  // Delete User
  const handleDeleteUser = async (userId, userName) => {
    if (userId === currentUserId) {
      setErrorMsg('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus akun ${userName}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN':
            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        setErrorMsg(json.message || 'Gagal menghapus pengguna.');
      }
    } catch (err) {
      setErrorMsg('Gagal menghapus pengguna. Silakan coba kembali.');
    }
  };

  return (
    <AppLayout
      activeMenu="settings"
      title="Pengaturan Akun Pengguna"
      subtitle="Kelola akun pengguna, hak akses peran, serta batas masa berlaku klien armada LED"
      statusBadge={
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          HAK AKSES ADMINISTRATOR
        </span>
      }
    >
      <Head title="Pengaturan Akun - LED-FLX Fleet Control" />

      <div className="space-y-6">
        {/* FEEDBACK ALERTS */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg('')}
              className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg('')}
              className="text-rose-700 hover:text-rose-900 p-1 rounded-lg hover:bg-rose-100/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SUMMARY STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Akun
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                {stats.total}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Administrator
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                {stats.adminCount}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Klien Aktif
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                {stats.activeClients}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Kadaluarsa / Nonaktif
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                {stats.expiredCount}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN USER MANAGEMENT CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          {/* TOOLBAR: SEARCH, FILTERS & ADD BUTTON */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Cari nama atau email pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Peran</option>
                  <option value="admin">Administrator</option>
                  <option value="user">Klien / User</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="expired">Kadaluarsa</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            </div>

            {/* Add User Action Button */}
            <button
              onClick={openCreateUserModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-blue-600/30 shrink-0"
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
                  <th className="px-5 py-3.5">Akun Pengguna</th>
                  <th className="px-5 py-3.5">Peran / Hak Akses</th>
                  <th className="px-5 py-3.5">Masa Berlaku</th>
                  <th className="px-5 py-3.5">Status Akun</th>
                  <th className="px-5 py-3.5">Terdaftar</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === currentUserId;
                    const initial = u.name ? u.name.charAt(0).toUpperCase() : 'U';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Akun Pengguna */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs text-white shadow-xs shrink-0 ${
                                u.role === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'
                              }`}
                            >
                              {initial}
                            </div>
                            <div className="truncate max-w-[200px]">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 truncate">
                                  {u.name}
                                </span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Peran / Hak Akses */}
                        <td className="px-5 py-3.5">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                              <Shield className="w-3 h-3 text-blue-600" />
                              Administrator (Full)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Users className="w-3 h-3 text-emerald-600" />
                              Klien (View Only)
                            </span>
                          )}
                        </td>

                        {/* Masa Berlaku */}
                        <td className="px-5 py-3.5">
                          {u.role === 'admin' ? (
                            <span className="text-[11px] font-bold text-slate-500 font-mono">
                              Tanpa Batas
                            </span>
                          ) : u.is_expired ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold font-mono">
                              <Clock className="w-3.5 h-3.5 text-rose-500" />
                              <span>Kadaluarsa ({u.expires_at_human})</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 text-[11px] font-bold font-mono">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <span>s/d {u.expires_at_human}</span>
                            </div>
                          )}
                        </td>

                        {/* Status Akun */}
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSelf}
                            title={isSelf ? 'Akun aktif saat ini' : 'Klik untuk mengubah status aktif/nonaktif'}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                              isSelf ? 'cursor-default' : 'cursor-pointer hover:opacity-80'
                            } ${
                              u.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            {u.is_active ? 'AKTIF' : 'NONAKTIF'}
                          </button>
                        </td>

                        {/* Tanggal Dibuat */}
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                          {u.created_at_human || '-'}
                        </td>

                        {/* Aksi */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditUserModal(u)}
                              className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                              title="Edit Data Pengguna"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              disabled={isSelf}
                              className={`p-2 rounded-xl border transition-colors ${
                                isSelf
                                  ? 'opacity-30 bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200 cursor-pointer'
                              }`}
                              title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">Tidak ada pengguna yang cocok</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Coba ubah kata kunci pencarian atau reset filter.
                      </p>
                      {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setRoleFilter('all');
                            setStatusFilter('all');
                          }}
                          className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Reset Pencarian
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* USER FORM MODAL (ADD & EDIT) */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  {editingUserId ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingUserId ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingUserId
                      ? 'Perbarui detail hak akses dan masa aktif pengguna'
                      : 'Buat kredensial akun baru untuk administrator atau klien'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap / Identitas Klien <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Surya Media / Budi Santoso"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alamat Email (Digunakan untuk Login) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="klien@perusahaan.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Kata Sandi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Sandi (Password){' '}
                  {editingUserId ? (
                    <span className="text-slate-400 font-normal">
                      (Kosongkan bila tidak ingin mengubah sandi)
                    </span>
                  ) : (
                    <span className="text-rose-500">*</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUserId}
                    placeholder={editingUserId ? '••••••••••••' : 'Minimal 6 karakter'}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Peran & Status Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Peran / Hak Akses <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="user">Klien / Client (Hanya Lihat)</option>
                    <option value="admin">Administrator (Akses Penuh)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Status Akun <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userForm.is_active ? '1' : '0'}
                    onChange={(e) =>
                      setUserForm({ ...userForm, is_active: e.target.value === '1' })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Masa Berlaku (Hanya untuk Klien / User) */}
              {userForm.role === 'user' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Masa Berlaku Akun Klien
                    </label>
                    <span className="text-[10px] text-slate-500">Batas akhir login</span>
                  </div>

                  <input
                    type="date"
                    value={userForm.expires_at}
                    onChange={(e) => setUserForm({ ...userForm, expires_at: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:border-blue-500 focus:outline-none cursor-pointer"
                  />

                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Preset:</span>
                    <button
                      type="button"
                      onClick={() => setExpirationPreset(30)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                    >
                      +1 Bulan
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationPreset(90)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                    >
                      +3 Bulan
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationPreset(180)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                    >
                      +6 Bulan
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationPreset(365)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                    >
                      +1 Tahun
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationPreset(null)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Tanpa Batas
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-blue-600/30 disabled:opacity-50"
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
