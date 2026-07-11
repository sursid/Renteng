# RentengPay (Kopdes)

Sistem pembayaran dan manajemen koperasi desa dengan integrasi AI.

## Panduan Instalasi

Untuk menjalankan project ini, pastikan Anda telah menginstal [Bun](https://bun.sh/) di sistem Anda.

1. Install semua dependencies:
   ```bash
   bun install
   ```

2. Setup dan sinkronisasi database (pastikan konfigurasi database di `.env` sudah benar):
   ```bash
   bunx prisma db push
   ```

3. Jalankan aplikasi:
   ```bash
   bun run dev
   ```

## Penjelasan Arsitektur

Project ini dibangun menggunakan stack modern dengan pendekatan yang otomatis dan efisien:

- **Runtime: Bun**  
  Menggunakan Bun sebagai JavaScript runtime yang sangat cepat, dengan dukungan package manager bawaan yang meningkatkan performa aplikasi secara komprehensif.
- **WhatsApp Baileys**  
  Library koneksi WhatsApp Web (MD) yang digunakan untuk integrasi notifikasi, interaksi chat dua arah dengan pengguna (anggota koperasi/pengurus), dan blast pesan.
- **Agentic Workflow**  
  Sistem menerapkan arsitektur agen otonom. AI tidak hanya membalas chat secara pasif, tetapi menjalankan alur kerja (workflow) agentic untuk menyelesaikan tugas spesifik seperti validasi persetujuan, pencocokan kebutuhan, dan operasional koperasi.

## Disclosure Penggunaan AI Generatif

**PENGUMUMAN PENTING**: Sistem ini secara aktif memanfaatkan teknologi **AI Generatif (Gemini / Kimi AI)** sebagai bagian dari logika inti (core logic) aplikasi.

AI dalam sistem ini secara spesifik diberikan tanggung jawab untuk:
- **Pengambilan Keputusan Order**: Menganalisis, memvalidasi, dan menentukan status pesanan (order) serta melakukan pencocokan (*matching*) antara pasokan dan permintaan dari anggota secara otomatis.
- **Routing**: Menentukan arah distribusi informasi, routing percakapan, dan eskalasi notifikasi secara otomatis kepada pengurus atau pihak yang tepat.

Seluruh jejak keputusan AI (termasuk *blast log*, *matching log*, dan log pembelajaran) direkam oleh sistem untuk memastikan transparansi dan sebagai bahan audit maupun evaluasi (*Human-in-the-Loop*) jika diperlukan.
