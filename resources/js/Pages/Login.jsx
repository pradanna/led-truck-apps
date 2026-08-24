import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Activity,
  Radio,
  AlertCircle,
  Headphones,
  CheckCircle2,
  Tv,
  Video,
  BarChart3,
  Navigation,
  Eye,
  EyeOff,
  MessageSquare,
  X,
  Clock,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

export default function Login() {
  const { errors } = usePage().props;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Modal Error State
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'general', // 'invalid', 'expired', 'inactive', 'network'
  });

  // Helper to determine error title & type based on message
  const analyzeErrorMessage = (msg) => {
    if (!msg) return { title: 'Gagal Masuk ke Portal', type: 'general' };
    const lower = msg.toLowerCase();

    if (lower.includes('berakhir') || lower.includes('kadaluarsa') || lower.includes('expired')) {
      return {
        title: 'Masa Berlaku Akun Telah Berakhir',
        type: 'expired',
        suggestion: 'Masa aktif akses akun Anda telah habis. Silakan hubungi tim administrator untuk proses perpanjangan masa tayang / monitoring armada.'
      };
    }
    if (lower.includes('nonaktif') || lower.includes('dinonaktifkan')) {
      return {
        title: 'Akun Sedang Dinonaktifkan',
        type: 'inactive',
        suggestion: 'Status akun Anda saat ini sedang dinonaktifkan oleh administrator. Silakan hubungi admin untuk mengaktifkan kembali.'
      };
    }
    if (lower.includes('jaringan') || lower.includes('network') || lower.includes('koneksi')) {
      return {
        title: 'Kendala Jaringan / Koneksi',
        type: 'network',
        suggestion: 'Terjadi gangguan komunikasi dengan server. Pastikan koneksi internet Anda stabil dan coba beberapa saat lagi.'
      };
    }

    return {
      title: 'Kombinasi Akun Tidak Sesuai',
      type: 'invalid',
      suggestion: 'Email atau kata sandi yang Anda masukkan tidak cocok dengan data terdaftar. Periksa kembali ejaan email dan huruf besar/kecil kata sandi Anda.'
    };
  };

  // Trigger modal when errors prop changes from backend
  useEffect(() => {
    if (errors && Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      const { title, type, suggestion } = analyzeErrorMessage(firstError);
      setErrorModal({
        isOpen: true,
        title,
        message: firstError,
        type,
        suggestion,
      });
    }
  }, [errors]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    router.post('/login', {
      email,
      password,
      remember,
    }, {
      onError: (errs) => {
        setIsLoading(false);
        const firstError = Object.values(errs)[0] || 'Kombinasi email atau kata sandi tidak valid.';
        const { title, type, suggestion } = analyzeErrorMessage(firstError);
        setErrorModal({
          isOpen: true,
          title,
          message: firstError,
          type,
          suggestion,
        });
      },
      onFinish: () => setIsLoading(false)
    });
  };

  return (
    <>
      <Head title="Masuk ke Akun - LED-FLX Fleet Control" />

      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans">
        {/* MAIN CONTAINER: 2-COLUMN PREMIUM LIGHT MODE CARD */}
        <div className="w-full max-w-5xl bg-white border border-slate-200/90 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
          
          {/* KOLOM KIRI (7 SPAN): GAMBAR TRUK LED & HERO PROMOSI */}
          <div className="lg:col-span-7 relative bg-slate-900 overflow-hidden flex flex-col justify-between p-8 sm:p-12 text-white">
            {/* Background Image with Ambient Gradient Overlay */}
            <img
              src="/images/led_truck_login.jpg"
              alt="Mobile LED Billboard Truck"
              className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 transition-transform duration-1000 hover:scale-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

            {/* Top Brand Logo */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="bg-white p-2 rounded-2xl shadow-lg shadow-black/30 shrink-0">
                <img
                  src="/images/local/logo-yousee-panjang.png"
                  alt="Yousee Logo"
                  className="h-8 w-auto object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/images/local/logo-yousee2.png';
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white">Yousee LED Truck</h1>
                <p className="text-[10px] text-blue-300 font-mono uppercase tracking-widest font-bold">
                  Fleet & CCTV Control System
                </p>
              </div>
            </div>

            {/* Middle Words & General Features */}
            <div className="relative z-10 space-y-4 my-auto py-8">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug text-white drop-shadow-md">
                Pusat Kendali & Monitoring Armada Truk LED
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
                Pantau operasional kendaraan, rute perjalanan, penayangan materi iklan, dan analitik trafik audiens secara terpadu.
              </p>

              {/* 3 General Feature Highlights Grid (No Brand Names) */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-900/70 backdrop-blur-md border border-white/10 p-3 rounded-2xl">
                  <Tv className="w-4 h-4 text-blue-400 mb-1.5" />
                  <div className="text-xs font-bold text-white">Live Playlog</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Monitoring Tayang</div>
                </div>

                <div className="bg-slate-900/70 backdrop-blur-md border border-white/10 p-3 rounded-2xl">
                  <Video className="w-4 h-4 text-emerald-400 mb-1.5" />
                  <div className="text-xs font-bold text-white">Live CCTV</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Monitoring Kamera</div>
                </div>

                <div className="bg-slate-900/70 backdrop-blur-md border border-white/10 p-3 rounded-2xl">
                  <BarChart3 className="w-4 h-4 text-purple-400 mb-1.5" />
                  <div className="text-xs font-bold text-white">Traffic Analisis</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Penghitungan Traffic</div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="relative z-10 text-[11px] text-slate-400">
              &copy; 2026 LED-FLX Fleet Control · Seluruh Hak Cipta Dilindungi.
            </div>
          </div>

          {/* KOLOM KANAN (5 SPAN): FORM LOGIN CLEAN LIGHT MODE */}
          <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between bg-white">
            <div>
              {/* Header Title */}
              <div className="mb-6">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Masuk ke Portal
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Masukkan email dan kata sandi akun Anda untuk mengakses dashboard operasional.
                </p>
              </div>

              {/* Error Alert Box */}
              {errors && Object.keys(errors).length > 0 && (
                <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-3 shadow-xs animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 flex-1">
                    <div className="font-extrabold text-rose-900">Gagal Masuk ke Portal</div>
                    {Object.values(errors).map((err, idx) => (
                      <p key={idx} className="font-medium text-rose-700">{err}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email Pengguna
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                      placeholder="nama@perusahaan.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 p-1"
                      title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="rounded border-slate-300 bg-slate-50 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-medium">Ingat perangkat saya</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/30 disabled:opacity-60 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" /> Memverifikasi Akun...
                    </>
                  ) : (
                    <>
                      Masuk Sekarang <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* BANTUAN & KONTAK ADMIN */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
                <Headphones className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-extrabold text-slate-900">Kendala Akses atau Akun Kadaluarsa?</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Jika Anda lupa kata sandi atau masa berlaku akun telah berakhir, silakan hubungi tim administrator.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 font-semibold">
                    <a
                      href="https://wa.me/6281234567890?text=Halo%20Admin%20LED-FLX,%20saya%20membutuhkan%20bantuan%20akses%20login."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline text-[11px]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Support
                    </a>
                    <span className="text-slate-300">·</span>
                    <a
                      href="mailto:support@centralled.id?subject=Bantuan%20Akses%20LED-FLX"
                      className="text-slate-600 hover:text-slate-900 text-[11px]"
                    >
                      support@centralled.id
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL ERROR INTERAKTIF (LIGHT MODE) */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header Icon & Title */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    errorModal.type === 'expired'
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : errorModal.type === 'inactive'
                      ? 'bg-slate-100 border-slate-300 text-slate-700'
                      : errorModal.type === 'network'
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : 'bg-rose-50 border-rose-200 text-rose-600'
                  }`}
                >
                  {errorModal.type === 'expired' ? (
                    <Clock className="w-6 h-6" />
                  ) : errorModal.type === 'inactive' ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : (
                    <AlertCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    {errorModal.title}
                  </h3>
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                      errorModal.type === 'expired'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    AUTENTIKASI DITOLAK
                  </span>
                </div>
              </div>

              <button
                onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Body Message */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-900 leading-relaxed">
                {errorModal.message}
              </div>
              {errorModal.suggestion && (
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {errorModal.suggestion}
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
                className="w-full sm:flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm shadow-blue-600/30 text-center"
              >
                Tutup & Coba Lagi
              </button>

              <a
                href={`https://wa.me/6281234567890?text=Halo%20Admin%20LED-FLX,%20saya%20mengalami%20kendala%20saat%20login:%20${encodeURIComponent(
                  errorModal.message
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Bantuan Admin</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
