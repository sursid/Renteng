import { PrismaClient } from "@prisma/client";
import { AiMatchingController } from "../controllers/AiMatchingController";

const prisma = new PrismaClient();

// ================================================================
// CRON JOB SERVICE — RentengPay Auto-Blast Engine
// Best Practice:
// 1. Guard: pastikan tidak ada 2 job yang jalan bersamaan (isRunning flag)
// 2. Guard: hanya jalan kalau ada order "open" di DB
// 3. Guard: WA Bot harus sudah terkoneksi sebelum blast dijalankan
// 4. Log tiap tick dengan timestamp biar mudah debug
// ================================================================

let isRunning = false; // Mutex guard — mencegah tumpang tindih job paralel

export function startCronJobs(getSocket: () => any) {
  const INTERVAL_MS = 60 * 1000; // 1 menit (ubah ke 5 * 60 * 1000 untuk production)

  console.log(
    `⏰ [CRON] Sistem Auto-Blast dimulai. Interval: ${INTERVAL_MS / 1000}s`
  );

  setInterval(async () => {
    const timestamp = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // ---- GUARD 1: Cek apakah job sebelumnya masih berjalan ----
    if (isRunning) {
      console.log(
        `⏰ [CRON ${timestamp}] Tick dilewati — job sebelumnya masih berjalan.`
      );
      return;
    }

    // ---- GUARD 2: Cek apakah WA sudah terkoneksi ----
    const sock = getSocket();
    if (!sock?.user) {
      console.log(
        `⏰ [CRON ${timestamp}] Tick dilewati — WhatsApp belum terkoneksi.`
      );
      return;
    }

    // ---- GUARD 3: Cek apakah ada order "open" di DB ----
    const openOrderCount = await prisma.kebutuhanSppg
      .count({ where: { status: "open" } })
      .catch(() => 0);

    if (openOrderCount === 0) {
      console.log(
        `⏰ [CRON ${timestamp}] Tick dilewati — tidak ada order SPPG yang open.`
      );
      return;
    }

    // ---- EKSEKUSI: Jalankan AI Matching + Blast ----
    isRunning = true;
    console.log(
      `\n🚀 [CRON ${timestamp}] TICK AKTIF — Ditemukan ${openOrderCount} order open. Menjalankan Paralel Orchestra...`
    );

    try {
      const result = await AiMatchingController.match({});

      if (result.success) {
        const matched = result.data?.length ?? 0;
        console.log(
          `✅ [CRON ${timestamp}] Orchestra selesai. ${matched} supplier cocok diantrikan ke blast.`
        );
      } else {
        console.warn(
          `⚠️  [CRON ${timestamp}] Orchestra selesai dengan pesan: ${result.message}`
        );
      }
    } catch (err: any) {
      console.error(`❌ [CRON ${timestamp}] Error saat orchestra:`, err.message);
    } finally {
      isRunning = false; // Selalu release mutex, bahkan kalau error
    }
  }, INTERVAL_MS);
}
