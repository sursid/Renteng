// Suppress annoying Bun WebSocket warnings from legacy 'ws' library
const originalStderrWrite = process.stderr.write;
// @ts-ignore
process.stderr.write = function (chunk: any, encoding?: any, callback?: any) {
  const str = chunk.toString();
  if (
    str.includes("ws.WebSocket 'upgrade'") || 
    str.includes("ws.WebSocket 'unexpected-response'")
  ) {
    if (callback) callback();
    return true;
  }
  return originalStderrWrite.apply(this, arguments);
};

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { connectWhatsApp, getSocket, getLatestQR } from "./whatsapp.js";
import QRCode from "qrcode";
import { Route } from "./src/routes/Route.ts";
import { startCronJobs } from "./src/services/CronService.ts";

// Start WhatsApp bot (session tersimpan, tidak perlu scan ulang)
connectWhatsApp();

const app = new Elysia()
  .use(cors())
  .use(Route)
  .get("/", () => ({
    status: "ok",
    message: "Kopdes API is running 🚀",
  }))

  // Tampilkan QR Code di browser — scan dari sini!
  .get("/wa/qr", async ({ set }) => {
    const qr = getLatestQR();

    set.headers["Content-Type"] = "text/html";

    if (!qr) {
      return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp QR - Kopdes</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0d1117; color: #fff; flex-direction: column; gap: 12px; }
    .icon { font-size: 64px; }
    h2 { margin: 0; font-size: 1.4rem; color: #e6edf3; }
    p { margin: 0; color: #8b949e; }
  </style>
</head>
<body>
  <div class="icon">✅</div>
  <h2>WhatsApp sudah terhubung!</h2>
  <p>Tidak ada QR Code yang perlu di-scan.</p>
</body>
</html>`;
    }

    const qrDataUrl = await QRCode.toDataURL(qr, { scale: 6, margin: 2 });

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="20">
  <title>Scan QR - Kopdes Bot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: #0d1117;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
      color: #fff;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .logo { font-size: 40px; margin-bottom: 12px; }
    h1 { font-size: 1.4rem; margin-bottom: 6px; color: #e6edf3; }
    p { font-size: 0.85rem; color: #8b949e; margin-bottom: 24px; }
    .qr-wrap {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      display: inline-block;
      margin-bottom: 24px;
    }
    .qr-wrap img { display: block; width: 220px; height: 220px; }
    .steps { text-align: left; background: #0d1117; border-radius: 10px; padding: 16px; list-style: decimal; list-style-position: inside; }
    .steps li { font-size: 0.82rem; color: #8b949e; margin-bottom: 6px; }
    .steps li strong { color: #58a6ff; }
    .refresh { margin-top: 16px; font-size: 0.75rem; color: #484f58; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">📱</div>
    <h1>Scan QR Code</h1>
    <p>Hubungkan WhatsApp kamu ke Kopdes Bot</p>
    <div class="qr-wrap">
      <img src="${qrDataUrl}" alt="WhatsApp QR Code" />
    </div>
    <ol class="steps">
      <li>Buka <strong>WhatsApp</strong> di HP kamu</li>
      <li>Tap <strong>⋮</strong> → <strong>Linked Devices</strong></li>
      <li>Tap <strong>Link a Device</strong></li>
      <li>Scan QR Code di atas</li>
    </ol>
    <p class="refresh">🔄 Auto-refresh tiap 20 detik</p>
  </div>
</body>
</html>`;
  })

  // Cek status koneksi WhatsApp
  .get("/wa/status", () => {
    const sock = getSocket();
    const connected = sock?.user != null;
    return {
      connected,
      user: sock?.user ?? null,
    };
  })

  // Kirim pesan via API
  .post("/wa/send", async ({ body }) => {
    const sock = getSocket();
    if (!sock?.user) {
      return { success: false, message: "WhatsApp belum terhubung" };
    }

    const { number, message } = body as { number: string; message: string };

    if (!number || !message) {
      return { success: false, message: "number dan message wajib diisi" };
    }

    const jid = number.includes("@")
      ? number
      : `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    try {
      await sock.sendMessage(jid, { text: message });
      return { success: true, message: `Pesan terkirim ke ${jid}` };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  })

  .listen(4444);

console.log(`🦊 Koperasi Server is running at ${app.server?.hostname}:${app.server?.port}`);

// ⏰ Mulai Cron Job Auto-Blast Orchestra (tiap 1 menit)
// Ganti interval di CronService.ts — 60s untuk dev, 5 menit untuk production
startCronJobs(getSocket);