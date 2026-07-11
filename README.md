# Kopdes (Koperasi Desa) - Supply Chain Agregator Berbasis WhatsApp 🚀

Proyek ini adalah solusi **AI-Powered Supply Chain** terintegrasi yang memberdayakan Koperasi Unit Desa (KUD) untuk menjadi pemasok utama bagi Dapur Program Makan Bergizi Gratis (MBG). 

Repositori ini adalah sebuah **Monorepo** yang berisi **2 proyek yang saling terhubung erat**, yaitu Backend (API Server & WhatsApp AI Bot) dan Frontend (Admin Dashboard).

---

## 📂 Struktur Repositori

Proyek ini dipisah menjadi dua direktori utama:

### 1. `BackEnd/` (Elysia.js, Prisma, & WhatsApp Baileys)
Sistem *core* (inti) yang mengatur logika bisnis, database, dan komunikasi dua arah dengan petani via WhatsApp.
- **WhatsApp AI Bot**: Diotaki oleh Gemini/Kimi NLP, bot ini memungkinkan petani lansia bertransaksi cukup dengan mengetik bahasa daerah santai di WhatsApp tanpa perlu aplikasi tambahan.
- **AI Matching Engine**: Otomasi perjodohan (matching) antara kebutuhan bahan pangan Dapur SPPG dengan kesanggupan pasokan dari petani lokal.
- **Push Notification Model**: Mem-blast pesanan ke WhatsApp petani secara proaktif kapanpun Dapur SPPG membutuhkan suplai (*Just-In-Time*).
- **Teknologi Utama**: Bun, Elysia.js, Prisma ORM, PostgreSQL, `@whiskeysockets/baileys`.

### 2. `FrontEnd/` (Next.js, TailwindCSS)
Dashboard interaktif berbasis web untuk **Pengurus Koperasi Desa**.
- **Kotak Kuning AI Matching**: UI khusus untuk menyetujui rekomendasi suplai petani dari *AI Matching Engine* cukup dengan satu klik (One-Click Approval).
- **Manajemen Kebutuhan SPPG**: Publikasi dan monitoring pesanan yang dibutuhkan oleh Dapur SPPG secara *real-time*.
- **Transparansi Logistik**: Memantau pergerakan bahan pangan dari ladang petani hingga sampai ke Dapur SPPG.
- **Teknologi Utama**: Next.js, React, TailwindCSS, Framer Motion.

---

## 🔗 Bagaimana Keduanya Terhubung?

1. **Sinkronisasi Real-time**: Tindakan di Dashboard Frontend (misal: mempublikasikan kebutuhan Dapur SPPG) akan memicu Backend untuk mengeksekusi AI Matching dan menembakkan pesan *blast* WhatsApp ke petani.
2. **Database Terpusat**: Keduanya berbagi database PostgreSQL yang sama untuk menjaga integritas data (pesanan, stok, status keberangkatan).
3. **Loop Komunikasi**: Balasan dari WhatsApp petani (misal: menyetujui tawaran atau mengonfirmasi barang telah dikirim) akan otomatis ditangkap Backend, dan statusnya diperbarui secara *live* di Frontend untuk dilihat oleh Pengurus Koperasi.

## 🧪 Prasyarat Testing (Wajib Baca)
Karena proyek ini mengandalkan komunikasi dua arah, untuk mendemokan alur secara penuh Anda membutuhkan **minimal 2 (dua) nomor WhatsApp yang berbeda**:
1. **Akun 1 (Petani/Supplier):** Bertindak sebagai pencari pesanan yang akan menerima notifikasi blast dan membalas kesanggupan suplai.
2. **Akun 2 (Admin SPPG):** Bertindak sebagai pihak Dapur SPPG yang akan menerima notifikasi dari bot saat penyedia (petani) telah ditemukan.

---

## 🔐 Kredensial Demo (Web Admin Dashboard)
Untuk masuk ke Dashboard FrontEnd (setelah dijalankan), gunakan kredensial berikut:
- **Email/Username**: `admin`
- **Password**: `admin`

---

## 🛠️ Cara Menjalankan Proyek (Development)

Pastikan Anda memiliki [Bun](https://bun.sh/) dan [Node.js](https://nodejs.org/) terinstal.

### Menggunakan Database Lokal (Opsional untuk Juri)
Jika Anda ingin menjalankan database secara lokal alih-alih menggunakan server *cloud* yang kami sediakan, kami telah menyertakan *dump* database lengkap beserta datanya di folder `BackEnd/kopdes_renteng.sql`.
Untuk mengimpornya dengan mudah:
- **Windows:** Klik dua kali atau jalankan `import_db.bat` di dalam folder `BackEnd/`
- **Mac/Linux:** Buka terminal, jalankan `chmod +x import_db.sh` lalu `./import_db.sh`
Setelah itu, sesuaikan `DATABASE_URL` di file `.env` ke MySQL lokal Anda.

### Menjalankan BackEnd (API & WhatsApp Bot)
*(Catatan Juri: File `.env` yang berisi kredensial Database PostgreSQL Cloud sudah kami sertakan langsung di dalam repositori ini agar Anda dapat langsung melakukan pengetesan tanpa perlu setup konfigurasi manual.)*

```bash
cd BackEnd
bun install
bunx prisma generate
bun run index.ts
```
*(Catatan: Proyek ini menggunakan [Bun](https://bun.sh/) sebagai runtime JavaScript modern yang sangat cepat. Perintah `bunx prisma generate` digunakan untuk menghasilkan Prisma Client dari skema database, dan `bun run index.ts` akan menjalankan server API dan inisialisasi bot WhatsApp).*

*Setelah perintah dijalankan, sistem akan menampilkan QR Code di terminal. Buka link yang diberikan untuk menghubungkan akun WhatsApp bot.*

### Menjalankan FrontEnd (Dashboard Web)
Buka terminal baru, lalu jalankan:

**A. Mode Development (Rekomendasi untuk Uji Coba Cepat)**
```bash
cd FrontEnd
npm install
npm run dev
```

**B. Mode Production (Lebih Cepat & Optimal)**
Jika Anda ingin melihat performa aslinya dalam mode produksi:
```bash
cd FrontEnd
npm install
npm run build
npm run start
```

*Akses dashboard di `http://localhost:3000/admin`.*

---
*Proyek ini dirancang untuk merevitalisasi Koperasi Desa, memutus rantai tengkulak, dan meningkatkan pendapatan petani lokal.* 🌾
