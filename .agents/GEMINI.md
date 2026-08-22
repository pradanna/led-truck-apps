# Global Workspace Rules - LED-FLX Fleet & CCTV Control System

## 1. UI Theme & Aesthetic Guidelines (STRICT LIGHT MODE ONLY)
- **Always Use Light Mode**: Seluruh halaman, komponen, card, modal, tabel, dan elemen antarmuka aplikasi **WAJIB selalu menggunakan tema Light Mode**.
- **Page Background**: Gunakan `bg-slate-100` atau `bg-slate-50`. Dilarang menggunakan background halaman hitam/dark mode penuh (`bg-slate-900`/`bg-slate-950`/`bg-black`).
- **Cards & Surfaces**: Gunakan `bg-white` dengan border halus `border-slate-200` atau `border-slate-100`, rounded corners (`rounded-2xl`), dan shadow lembut (`shadow-xs` / `shadow-sm`).
- **Typography & Text**:
  - Judul / Headings: `text-slate-900` font tebal (`font-extrabold` / `font-bold`).
  - Body Text: `text-slate-700` atau `text-slate-600`.
  - Muted Label / Caption: `text-slate-500` / `text-slate-400`.
  - Monospace (Angka, ID, Telemetri): `font-mono text-slate-800`.
- **Sidebar**: Menggunakan sidebar bersama standar `#0B132B` (`resources/js/Components/Sidebar.jsx`).
- **Navbar**: Menggunakan navbar putih `bg-white border-b border-slate-200` (`resources/js/Components/Navbar.jsx`).
- **CCTV & Video Player Container**: Area frame pemutar video dapat menggunakan aspect ratio hitam/gelap untuk kebutuhan kontras feed kamera, namun kartu pembungkus, kontrol panel, header, modal, dan analytic metrics di sekelilingnya **WAJIB tetap bernuansa Light Mode (Putih/Slate-100)**.
- **No Sparkles / Spark Icons**: Dilarang menggunakan icon spark/sparkles (`Sparkles`, `Sparkle`) di seluruh komponen UI/tombol. Gunakan icon fungsional yang relevan seperti `Save`, `Plus`, `Send`, `Check`, atau `Upload`.

## 2. Layout & Navigasi
- Semua halaman Inertia harus menggunakan struktur layout terpadu dengan `<Sidebar activeMenu="..." />` dan `<Navbar title="..." />`.

## 3. Anti-Bloat & Kode Bersih
- Menjaga kode tetap rapi, performan, dan modular.
- Hindari duplikasi kode dan pastikan semua perubahan di-build dengan `npm run build` tanpa error.

## 5. End-User Friendly Copywriting & Humanized Error Messages
- **Dilarang Menggunakan Istilah Teknis Mentah**: Jangan menampilkan kata-kata seperti `API`, `Endpoint`, `JSON`, `Payload`, `Null`, `Token`, `Database error`, `Exception`, `HTTP 500`, `NVR ObjectStatistics/Get`, dll kepada pengguna akhir (Client/Admin umum).
- **Gunakan Bahasa Manusia & Solutif**:
  - Ganti istilah teknis dengan padanan operasional yang mudah dipahami:
    - `API Tidak Terhubung` -> `Sensor kamera / pelacak belum aktif` atau `Sistem sedang menghubungkan perangkat`.
    - `Data API Kosong / Null` -> `Belum ada riwayat aktivitas yang tercatat pada periode ini`.
    - `API Token Expired` -> `Sesi koneksi perlu diperbarui`.
    - `NVR Offline` -> `Kamera armada sedang dalam posisi mati / standby`.
  - Semua pesan error, peringatan, tooltip, dan banner keterangan harus ditulis dengan bahasa Indonesia yang ramah, sopan, profesional, dan menjelaskan kondisi nyata operasional armada.

