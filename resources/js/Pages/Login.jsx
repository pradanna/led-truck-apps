import React, { useState } from 'react';
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
  MessageSquare
} from 'lucide-react';

export default function Login() {
  const { errors } = usePage().props;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    router.post('/login', {
      email,
      password,
      remember,
    }, {
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
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2.5 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    {Object.values(errors).map((err, idx) => (
                      <p key={idx}>{err}</p>
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
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                      placeholder="••••••••••••"
                    />
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
    </>
  );
}
