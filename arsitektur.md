# Arsitektur Aplikasi LED-FLX Fleet Control System (Layered Architecture)

Dokumen ini mendokumentasikan pola **Layered Architecture (Arsitektur Multi-Lapis)** yang diterapkan pada platform **LED-FLX Fleet Control System** untuk mengelola playlist, playlog, serta integrasi dengan **VNNOX / Novastar Videotron Cloud API**.

---

## 1. Ikhtisar Arsitektur Lapis (Layered Architecture)

Aplikasi dibangun menggunakan kombinasi **Laravel 11 (Backend)** dan **React + Inertia.js (Frontend)** dengan pembagian peran yang tegas pada setiap lapisannya:

```mermaid
graph TD
    subgraph Presentation Layer (Frontend - React & Inertia)
        UI[Playlog & Playlist Page]
        Comp1[PlaylistGrid & PlaylistItemCard]
        Comp2[NovastarControllerCard]
        Comp3[PlaylogRecordsTable & FilterBar]
    end

    subgraph Application Layer (Laravel Controllers & Routes)
        Routes[routes/web.php & routes/api.php]
        PlaylogCtrl[PlaylogController]
        VnnoxCtrl[VnnoxApiController]
    end

    subgraph Domain / Service Layer (Business Logic)
        PlaylogService[PlaylogService]
        VnnoxAuthService[VnnoxAuthService]
        VnnoxDeviceService[VnnoxDeviceService]
    end

    subgraph Data / Integration Layer (API Client & Persistence)
        VnnoxApiClient[VnnoxApiClient]
        PlaylogRepository[PlaylogRepository]
        Cache[Laravel Cache / SQLite DB]
    end

    subgraph External System
        VNNOXAPI[VNNOX Cloud API - open-eu.vnnox.com]
    end

    UI --> Routes
    Routes --> PlaylogCtrl
    Routes --> VnnoxCtrl
    PlaylogCtrl --> PlaylogService
    VnnoxCtrl --> PlaylogService
    VnnoxCtrl --> VnnoxDeviceService
    PlaylogService --> VnnoxAuthService
    PlaylogService --> VnnoxApiClient
    PlaylogService --> PlaylogRepository
    VnnoxDeviceService --> VnnoxApiClient
    VnnoxApiClient --> VNNOXAPI
    PlaylogRepository --> Cache
```

---

## 2. Detail Pembagian Lapisan (Layer Breakdown)

### 💻 1. Presentation Layer (Frontend - React + Inertia.js)
Lokasi: `resources/js/`

Bertanggung jawab atas tampilan antarmuka (UI/UX), interaktivitas pengguna, state management lokal, dan perataan tata letak sesuai mockup desain **LED-FLX Fleet Control System**.

- **Pages (`resources/js/Pages/`)**:
  - `PlaylogPlaylist.jsx`: Halaman utama yang menggabungkan seluruh komponen halaman Playlog & Playlist.
  - `Dashboard.jsx`: Halaman dashboard utama & Live GPS Tracking.
  
- **Components (`resources/js/Components/`)**:
  - `Sidebar.jsx`: Navigasi samping (Dark Navy Theme) dengan widget status *ACTIVE FLEET (12/35 Live Units)*.
  - `Header.jsx`: Topbar nama armada (*LED Truck Giga 01*), lokasi (*Bundaran HI*), badge status live, serta tanggal & waktu operasional.
  - `BannerHeader.jsx`: Banner ucapan selamat datang dan tombol aksi `+ Tambah Materi Baru`.
  - `PlaylistGrid.jsx` & `PlaylistItemCard.jsx`: Grid antrean materi LED beserta ID, thumbnail, judul kampanye, klien, durasi, frekuensi, impresi, badge status (`PLAYING`, `ACTIVE`, `SCHEDULED`, `PAUSED`), dan tombol aksi `Tayangkan`.
  - `NovastarControllerCard.jsx`: Widget pemantauan hardware pengontrol Novastar (Processor Chip, LED Refresh Rate, Pixel Pitch, Link Receiving Cards, Kesehatan Fan Cooler).
  - `PlaylogRecordsTable.jsx`: Tabel histori penayangan terperinci dilengkapi fitur pencarian, filter status, ekspor laporan CSV, dan badge indikator status (`Success`, `Warning`, `Error`).

---

### ⚙️ 2. Application Layer (Backend Controllers & Routing)
Lokasi: `app/Http/Controllers/` & `routes/`

Bertanggung jawab menerima request HTTP dari client, memvalidasi input request, serta mengembalikan respon berupa tampilan Inertia atau JSON data.

- **Controllers**:
  - `PlaylogController.php`:
    - `index()`: Mengambil data antrean playlist, status controller Novastar, dan histori log penayangan untuk di-render di Inertia `PlaylogPlaylist`.
    - `exportCsv()`: Mengunduh histori playlog dalam format CSV.
  - `VnnoxApiController.php`:
    - `triggerPlay(Request $request)`: Mengubah materi tayangan yang sedang diputar di layar LED melalui VNNOX API.
    - `getControllerStatus()`: Mengambil data realtime status hardware Novastar Controller.

---

### 🧠 3. Domain / Service Layer (Business Logic)
Lokasi: `app/Services/`

Bertanggung jawab atas logika bisnis utama aplikasi, termasuk perhitungan impresi, enkapsulasi aturan validasi bisnis, dan orchestrator antar layanan.

- **Services**:
  - `Services/Vnnox/VnnoxAuthService.php`:
    - Bertanggung jawab memproses autentikasi VNNOX secara stateless.
    - Mengenerate `Nonce`, timestamp `CurTime`, dan menghitung `CheckSum = SHA256(AppSecret + Nonce + CurTime)`.
    - Memastikan selisih timestamp tidak melebihi 5 menit.
  - `Services/Vnnox/VnnoxPlaylogService.php`:
    - Mengelola daftar antrean playlist materi iklan dan kalkulasi impresi harian.
    - Menggabungkan data playlog dari API VNNOX dengan database lokal.
    - Mengformat log aktivitas ke format laporan ekspor CSV.
  - `Services/Vnnox/VnnoxDeviceService.php`:
    - Mengambil data telemetri kesehatan hardware Novastar T60-S controller dan receiving card.

---

### 🔌 4. Data / Integration Layer (Repositories & API Client)
Lokasi: `app/Repositories/` & `app/Services/Vnnox/VnnoxApiClient.php`

Bertanggung jawab atas komunikasi tingkat rendah dengan API eksternal VNNOX dan akses database/cache lokal.

- **Integrasi VNNOX Client**:
  - `VnnoxApiClient.php`: Wrapper `Illuminate\Support\Facades\Http` untuk mengeksekusi request ke `https://openapi-eu.vnnox.com`.
  - Menerapkan **Rate Limiting Guard** (maksimal 15 req/detik, 1500 req/jam) dan **Exponential Backoff** jika terjadi retry.
  - Menyuntikkan public headers (`AppKey`, `Nonce`, `CurTime`, `CheckSum`) secara otomatis di setiap outbound request.

- **Repositories**:
  - `PlaylogRepository.php`: Menyimpan & mengambil riwayat playlog dan status playlist di cache/database SQLite lokal untuk performa tinggi dan proteksi terhadap rate limit API.

---

## 3. Data Flow (Alur Kerja Eksekusi API & Render UI)

```
[User Klik "Tayangkan"]
         │
         ▼
[React UI: PlaylistItemCard] ──(AJAX POST /api/vnnox/play)──► [VnnoxApiController]
                                                                     │
                                                                     ▼
                                                           [VnnoxPlaylogService]
                                                                     │
                                                                     ▼
                                                            [VnnoxAuthService]
                                                            (Generate SHA256 CheckSum)
                                                                     │
                                                                     ▼
                                                            [VnnoxApiClient]
                                                        (HTTP Header + Rate Limit)
                                                                     │
                                                                     ▼
                                                           [VNNOX Cloud API EU]
                                                                     │
                                                                     ▼
                                                            [Respon OK 200]
                                                                     │
                                                                     ▼
[React UI Update State & Badge `PLAYING`] ◄──(JSON Response)──────────┘
```

---

## 4. Keunggulan Struktur Layered Ini
1. **Separation of Concerns (SoC)**: Logika UI React terpisah dari logika bisnis Laravel, dan logika integrasi API VNNOX dienkapsulasi di service tersendiri.
2. **Keamanan Credentials**: `AppSecret` tidak pernah diekspos ke frontend React; pembuatan signature `CheckSum` murni dilakukan di backend (`VnnoxAuthService`).
3. **Resilience & Rate Limit Protection**: Menggunakan pembungkus `VnnoxApiClient` dengan caching local di repository layer untuk menjaga penggunaan kuota API VNNOX (1500 req/jam).
4. **Easily Testable**: Setiap layer dapat diuji secara independen (Unit test untuk `VnnoxAuthService` signature SHA256, Mock HTTP Client untuk `VnnoxApiClient`).
