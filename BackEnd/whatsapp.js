import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";
import { askKimi } from "./src/services/kimiService.ts";
import { askGemini } from "./src/services/geminiService.ts";
import { prisma } from "./lib/db.ts";

const pendingWithdrawals = new Map();
const pendingRentengLoans = new Map();
const pendingDepartures = new Map(); // FIX: track petani yang sedang pilih order mana yang mau dikirim

const askAI = async (prompt) => {
  // Langsung pakai Gemini API karena Kimi web token sering expired dan menyebabkan timeout sangat lama
  return await askGemini(prompt);
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Folder tempat session tersimpan agar tidak perlu scan ulang
const SESSION_DIR = path.join(__dirname, "session");

const logger = pino({ level: "silent" });

let sock = null;
let currentQR = null; // simpan QR string terbaru
const processedMessageIds = new Set();

export function getLatestQR() {
  return currentQR;
}

export async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.ubuntu("Chrome"),
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr; // simpan QR terbaru
      console.log("\n📱 QR Code siap! Buka browser dan akses:");
      console.log("   ➜  http://localhost:4444/wa/qr\n");
    }

    if (connection === "close") {
      currentQR = null;
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reason = lastDisconnect?.error?.message ?? "";

      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut &&
        !reason.includes("conflict"); // jangan reconnect kalau ada instance lain aktif

      console.log("❌ Koneksi terputus karena:", reason);

      if (reason.includes("conflict")) {
        console.log("⚠️  Instance lain sedang aktif. Hentikan dulu yang lain lalu restart.");
        return;
      }

      if (shouldReconnect) {
        console.log("🔄 Reconnecting...");
        connectWhatsApp();
      } else {
        console.log("🚪 Logged out. Hapus folder session/ dan scan ulang.");
      }
    } else if (connection === "open") {
      currentQR = null;
      console.log("✅ WhatsApp terhubung!");
      
      // === AUTO-POLLING INTERVAL (ORCHESTRA) ===
      setInterval(async () => {
        try {
          const pendingBlasts = await prisma.aiBlastLog.findMany({
            where: { statusKirim: "pending" },
            include: { 
              matching: {
                include: {
                  anggota: true,
                  order: true
                }
              }
            }
          });

          for (const blast of pendingBlasts) {
            const anggota = blast.matching?.anggota;
            const kebutuhan = blast.matching?.order;
            
            if (!anggota || !kebutuhan) continue;

            const noWa = anggota.noWhatsapp;
            // Pastikan format nomor diawali 62
            let formatTarget = noWa;
            if (formatTarget.startsWith("0")) formatTarget = "62" + formatTarget.substring(1);
            
            const targetJid = formatTarget + "@s.whatsapp.net";
            const pesan = `Halo ${anggota.nama}, ada pesanan baru:\n`
              + `1. Barang: *${kebutuhan.produk}*\n`
              + `2. Banyaknya: *${kebutuhan.jumlah} ${kebutuhan.satuan}*\n`
              + `3. Harga: *Rp ${Number(kebutuhan.hargaMaksimal).toLocaleString('id-ID')}/${kebutuhan.satuan}*\n\n`
              + `Ketik *SETUJU* jika bapak/ibu ingin mengambil pesanan ini.`;


            await sock.sendMessage(targetJid, { text: pesan });

            // Update status ke sent
            await prisma.aiBlastLog.update({
              where: { id: blast.id },
              data: { statusKirim: "sent" }
            });
            console.log(`📤 BLAST TERKIRIM → ${formatTarget}`);
          }
        } catch (err) {
          console.error("Gagal polling BlastLog:", err);
        }
      }, 10000); // Polling setiap 10 detik
    }
  });

  // Handler pesan masuk
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      // Ambil ID dari remoteJidAlt jika ada (untuk mengatasi masalah @lid Linked Devices)
      const from = msg.key.remoteJidAlt || msg.key.remoteJid;
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

      // === HANDLE PESAN NON-TEKS (Voice Note, Gambar, Stiker, Dokumen) ===
      const isNonText = !text && (
        msg.message?.audioMessage ||
        msg.message?.imageMessage ||
        msg.message?.stickerMessage ||
        msg.message?.documentMessage ||
        msg.message?.videoMessage
      );


      // === DEDUPLIKASI PESAN ===
      if (processedMessageIds.has(msg.key.id)) {

        continue;
      }
      processedMessageIds.add(msg.key.id);
      if (processedMessageIds.size > 1000) {
        const firstItem = processedMessageIds.values().next().value;
        processedMessageIds.delete(firstItem);
      }

      // === VALIDASI NOMOR ANGGOTA / SPPG ===
      let senderNumber = from.includes("@g.us") ? msg.key.participant : from;
      if (!senderNumber) senderNumber = from;
      const plainNumber = senderNumber.split('@')[0];
      
      // Ambil 8-10 digit terakhir untuk pencocokan yang aman (mengakali beda 08 dan 628)
      const lastDigits = plainNumber.slice(-9); 

      // === REGISTER JURI BYPASS (Di atas validasi agar nomor baru bisa register) ===
      const msgLower = text.trim().toLowerCase();
      if (msgLower === 'daftar juri') {
        let juri = await prisma.anggota.findFirst({
          where: { noWhatsapp: { endsWith: lastDigits } }
        });
        if (!juri) {
          // Auto-provisioning Juri
          juri = await prisma.anggota.create({
            data: {
              nama: "Juri Hackathon",
              noWhatsapp: plainNumber,
              idKoperasi: 1, // Koperasi default
              kategoriUsaha: "Juri",
              saldo: 1000000.00,
              creditScore: 100,
              optInConsent: true
            }
          });
        } else {
          await prisma.anggota.updateMany({
            where: { noWhatsapp: { endsWith: lastDigits } },
            data: { optInConsent: true }
          });
        }
        await sock.sendMessage(from, { text: '✅ Nomor Anda telah terdaftar sebagai Juri. Selamat datang! Anda dapat menggunakan semua fitur bot (Saldo, Pinjaman, HPP, POS, dll).' });
        continue;
      }

      const cekAnggota = await prisma.anggota.findFirst({
        where: { noWhatsapp: { endsWith: lastDigits } }
      });

      if (!cekAnggota) {
        continue; // Silent ignore untuk yang bukan anggota
      }

      console.log(`\n=================================================`);
      console.log(`💬 PESAN MASUK BARU (Anggota Valid):`);
      console.log(`   Dari  : ${from}`);
      console.log(`   Pesan : ${text || '[NON-TEKS]'}`);
      console.log(`=================================================`);

      // === FALLBACK PESAN NON-TEKS (Voice Note, Gambar, Stiker) ===
      if (isNonText) {
        await sock.sendMessage(from, { text: `Maaf ${cekAnggota.sapaan || 'Bapak/Ibu'} ${cekAnggota.nama?.split(' ')[0] || ''}, saat ini asisten kami hanya bisa membaca pesan teks biasa 🙏\n\nUntuk balas pesanan ketik: *SETUJU* atau *TOLAK*\nUntuk cek saldo ketik: *SALDO*` });
        continue;
      }

      // Guard: jika text kosong setelah semua pengecekan, abaikan
      if (!text.trim()) continue;

      // D. Cek Konfirmasi Penarikan Pending
      if (pendingWithdrawals.has(from)) {
        const msgAgree = ['ya', 'yes', 'ok', 'oke', 'leres', 'betul', 'bener', 'setuju', 'muhun', 'iya', 'heeh'].includes(msgLower.trim());
        if (msgAgree) {
          const nominal = pendingWithdrawals.get(from);
          pendingWithdrawals.delete(from);
          try {
             const res = await fetch(`http://localhost:4444/transaksi/tarik`, {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ noWa: from.split('@')[0], jumlah: nominal })
             });
             const resData = await res.json();
             const replyText = resData.success ? `${resData.message}` : `Gagal: ${resData.message}`;
             await sock.sendMessage(from, { text: replyText });
             await saveChatSession(text, replyText);
          } catch(e) {
             await sock.sendMessage(from, { text: `Terjadi kesalahan server.` });
          }
        } else {
          pendingWithdrawals.delete(from);
          await sock.sendMessage(from, { text: `Pencairan dana dibatalkan.` });
        }
        continue;
      }

      // === TANGGUNG RENTENG: Cek Persetujuan Penjamin Kelompok (Regex Bypass) ===
      const rentengMatch = text.match(/^(setuju|tolak)\s+pinjaman\s+(\d+)$/i);
      if (rentengMatch && cekAnggota) {
        const action = rentengMatch[1].toUpperCase(); // SETUJU or TOLAK
        const loanId = Number(rentengMatch[2]);
        
        console.log(`👤 Penjamin ${cekAnggota.nama} membalas pinjaman ${loanId} dengan aksi: ${action}`);

        const loan = pendingRentengLoans.get(loanId);
        if (loan) {
          if (loan.penjaminJids.includes(from)) {
            if (action === "SETUJU") {
              loan.approvals.add(from);
              console.log(`✅ Penjamin disetujui. Total persetujuan saat ini: ${loan.approvals.size}/${loan.penjaminJids.length}`);

              // Kirim notifikasi terima kasih ke penjamin
              const penjaminNamaKecil = cekAnggota.nama?.split(' ')[0] || '';
              await sock.sendMessage(from, { text: `Terima kasih Bapak/Ibu ${penjaminNamaKecil}, persetujuan Tanggung Renteng Anda telah tercatat.` });

              // Cek kuorum (jika minimal 50% rekan kelompok setuju)
              const minApprovals = Math.ceil(loan.penjaminJids.length / 2);
              if (loan.approvals.size >= minApprovals && loan.status !== "approved") {
                loan.status = "approved"; // tandai sudah approved agar tidak double disburse
                try {
                  // Update database pinjaman disetujui & cairkan dana ke borrower
                  await prisma.$transaction([
                    prisma.pinjaman.update({
                      where: { id: loanId },
                      data: { status: 'disetujui' }
                    }),
                    prisma.anggota.update({
                      where: { noWhatsapp: { endsWith: loan.borrowerWa.split('@')[0].slice(-9) } },
                      data: { saldo: { increment: loan.jumlah } }
                    })
                  ]);

                  // Kirim pemberitahuan sukses pencairan ke peminjam (borrower)
                  const borrowerMsg = `🎉 *[PINJAMAN CAIR]* 🎉\n\n`
                    + `Halo ${loan.borrowerNama}, pengajuan pinjaman Tanggung Renteng Anda sebesar *Rp ${loan.jumlah.toLocaleString('id-ID')}* telah DISETUJUI oleh kelompok Anda!\n\n`
                    + `Dana telah berhasil ditransfer ke Saldo Koperasi Anda. Silakan cek saldo dengan mengetik *SALDO*.`;
                  await sock.sendMessage(loan.borrowerWa, { text: borrowerMsg });

                  // Kirim pemberitahuan ke seluruh kelompok penjamin bahwa pinjaman sudah sah dicairkan
                  const groupSuccessMsg = `ℹ️ *[INFO RENTENG]*\n\n`
                    + `Pinjaman modal Rp ${loan.jumlah.toLocaleString('id-ID')} untuk rekan Anda *${loan.borrowerNama}* telah sah dicairkan setelah mendapatkan kuorum persetujuan dari kelompok.`;
                  
                  for (const jid of loan.penjaminJids) {
                    await sock.sendMessage(jid, { text: groupSuccessMsg });
                  }

                  // Bersihkan state dari memori
                  pendingRentengLoans.delete(loanId);

                } catch (dbErr) {
                  console.error("Gagal mencairkan pinjaman renteng:", dbErr.message);
                }
              }
            } else {
              // TOLAK case
              const penjaminNamaKecil = cekAnggota.nama?.split(' ')[0] || '';
              await sock.sendMessage(from, { text: `Baik Bapak/Ibu ${penjaminNamaKecil}, penolakan Anda telah dicatat.` });
            }
          } else {
            await sock.sendMessage(from, { text: `Maaf, Anda tidak terdaftar sebagai penjamin untuk pinjaman ini.` });
          }
        } else {
          await sock.sendMessage(from, { text: `Maaf, kode pinjaman tersebut sudah tidak aktif atau sudah dicairkan.` });
        }
        continue;
      }

      // === COMPLIANCE: UU PDP Opt-In (Untuk Petani/Anggota Umum) ===
      if (cekAnggota && !cekAnggota.optInConsent) {
        // Gunakan AI untuk mendeteksi persetujuan bahasa alami secara longgar
        const promptConsent = `[ABAIKAN SEMUA PERCAKAPAN SEBELUMNYA]
Tugasmu adalah menganalisis apakah pesan WhatsApp ini bermakna persetujuan ("setuju", "ya", "oke", "nggih", "boleh", "silakan", "lanjut"): "${text}".
Kembalikan HANYA JSON murni (jangan gunakan markdown block):
{"isAgree": true}`;

        let isAgree = false;
        try {
          const consentRes = await askAI(promptConsent);
          const cleanJson = consentRes.replace(/```json/gi, "").replace(/```/g, "").trim();
          const consentData = JSON.parse(cleanJson);
          isAgree = !!consentData.isAgree;
        } catch (e) {
          isAgree = ['setuju', 'ya', 'oke', 'nggih', 'ok', 'yes', 'boleh'].includes(msgLower.trim());
        }

        if (isAgree) {
          await prisma.anggota.updateMany({
            where: { noWhatsapp: { endsWith: lastDigits } },
            data: { optInConsent: true }
          });
          await sock.sendMessage(from, { text: 'Pendaftaran sukses! Bapak/ibu sudah bisa cek saldo sekarang.' });
        } else {
          await sock.sendMessage(from, { text: 'Supaya koperasi bisa mencatat tabungan bapak/ibu secara aman, mohon balas dengan kata *SETUJU* ya.' });
        }
        continue;
      }
      // =====================================

      const textUpper = text.toUpperCase();

      // 1. CEK SALDO
      if (textUpper === "CEK SALDO" || textUpper === "SALDO") {
        try {
            const res = await fetch(`http://localhost:4444/transaksi/saldo?noWa=${from.split('@')[0]}`);
            const saldoData = await res.json();
            if(saldoData.success) {
                await sock.sendMessage(from, { text: `Uang bapak/ibu di koperasi saat ini:\n*Rp ${Number(saldoData.saldo).toLocaleString('id-ID')}*\n\nJika ingin mengambil uang, ketik: TARIK [jumlah]` });
            } else {
                await sock.sendMessage(from, { text: `Nomor Anda belum terdaftar.` });
            }
        } catch(e) {
            await sock.sendMessage(from, { text: `Gagal mengecek saldo.` });
        }
        continue;
      }

      // 2. TARIK TUNAI
      if (textUpper.startsWith("TARIK ")) {
        const nominal = parseInt(textUpper.split(" ")[1]);
        if(isNaN(nominal)) {
            await sock.sendMessage(from, { text: `Format salah. Contoh: TARIK 50000` });
            continue;
        }
        try {
            const res = await fetch(`http://localhost:4444/transaksi/tarik`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ noWa: from.split('@')[0], jumlah: nominal })
            });
            const data = await res.json();
            await sock.sendMessage(from, { text: data.success ? `${data.message}` : `Gagal: ${data.message}` });
        } catch(e) {
            await sock.sendMessage(from, { text: `Terjadi kesalahan server.` });
        }
        continue;
      }

      // 3. JIKA CHAT ADALAH BALASAN SUPPLIER (SETUJU / TOLAK)
      if (textUpper.startsWith("SETUJU") || textUpper.startsWith("TOLAK")) {
         const parts = textUpper.split("-");
         const cmd = parts[0];
         const idOrder = parts[1] ? parseInt(parts[1]) : null;
         
         try {
            const res = await fetch(`http://localhost:4444/ai/blast/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ noWhatsapp: from.split('@')[0], jawaban: cmd, idOrder })
            });
            const data = await res.json();
            await sock.sendMessage(from, { text: data.success ? `${data.message}` : `${data.message}` });
         } catch(e) {
            await sock.sendMessage(from, { text: `Terjadi kesalahan saat memproses balasan Anda.` });
         }
         continue;
      } 
      
      // 4. BARANG MULAI BERANGKAT (OTW)
      if (textUpper.startsWith("BERANGKAT") || textUpper.startsWith("OTW")) {
         const parts = textUpper.split("-");
         const cmd = parts[0];
         const idOrder = parts[1] ? parseInt(parts[1]) : null;
         
         try {
            const res = await fetch(`http://localhost:4444/transaksi/berangkat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idOrder, noWa: from.split('@')[0] })
            });
            const resData = await res.json();
            
            let replyText = "";
            if (resData.success) {
               replyText = `🚚 ${resData.message}`;
            } else if (resData.multiple) {
               const listOrders = resData.orders.map((o, idx) => `${idx + 1}. ${o.jumlah} ${o.satuan} ${o.produk}`).join("\n");
               replyText = `Bapak/Ibu punya beberapa pesanan aktif yang siap dikirim:\n${listOrders}\n\nYang mana yang mulai dikirim? (Balas dengan nama, contoh: OTW Beras).`;
            } else {
               replyText = `${resData.message}`;
            }
            
            await sock.sendMessage(from, { text: replyText });
            await saveChatSession(text, replyText);
         } catch(e) {
            await sock.sendMessage(from, { text: `Terjadi kesalahan saat memproses keberangkatan.` });
         }
         continue;
      }

      // 5. KONFIRMASI DITERIMA OLEH SPPG
      if (textUpper.startsWith("DITERIMA")) {
         const parts = textUpper.split("-");
         const idOrder = parts[1] ? parseInt(parts[1]) : null;
         if(!idOrder) {
            await sock.sendMessage(from, { text: `Format salah. Ketik DITERIMA-[ID_ORDER], contoh: DITERIMA-12` });
            continue;
         }
         try {
            const res = await fetch(`http://localhost:4444/transaksi/selesai`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idOrder, noWa: from.split('@')[0] })
            });
            const data = await res.json();
            await sock.sendMessage(from, { text: data.success ? `${data.message}` : `${data.message}` });
         } catch(e) {
            await sock.sendMessage(from, { text: `Terjadi kesalahan saat konfirmasi penerimaan.` });
         }
         continue;
      }

      // 5. PING & HALO
      if (text.toLowerCase() === "ping") {
        await sock.sendMessage(from, { text: "🏓 Pong! Bot aktif!" });
        continue;
      }
      if (text.toLowerCase() === "halo" || text.toLowerCase() === "hai") {
        await sock.sendMessage(from, { text: "👋 Halo! Selamat datang di RentengPay Bot (Sistem Koperasi Desa)!" });
        continue;
      }

      // Ambil Profil User dari DB untuk Konteks Kimi
      const rawNomor = from.split('@')[0];
      let searchNomor = rawNomor;
      if (searchNomor.startsWith("62")) searchNomor = searchNomor.substring(2);
      if (searchNomor.startsWith("0")) searchNomor = searchNomor.substring(1);
      


      let profilContext = "Nomor WhatsApp ini belum terkait profil spesifik. Bisa jadi Petani, Pengurus Koperasi, atau Admin SPPG.";
      let idKoperasiUser = null;
      let anggota = null;
      try {
        anggota = await prisma.anggota.findFirst({ 
            where: { noWhatsapp: { endsWith: searchNomor } }, 
            include: { koperasi: true } 
        });
        if (anggota) {
           idKoperasiUser = anggota.idKoperasi;

            profilContext = `Nama: ${anggota.nama}
Peran: Anggota/Petani Koperasi ${anggota.koperasi.namaKoperasi}
Domisili: ${anggota.koperasi.idDesa}
Usaha: ${anggota.kategoriUsaha}
Saldo: Rp${anggota.saldo}
Gender: ${anggota.gender || "Belum diketahui"}
Sapaan: ${anggota.sapaan || "Belum diketahui"}`;
        }
      } catch(e) {
           console.log(`⚠️ Error DB: ${e.message}`);
      }

      // Helper Simpan ChatSession ke DB
      const saveChatSession = async (pesan, balasan) => {
        try {
          if (anggota && anggota.id) {
            await prisma.chatSession.create({
              data: {
                idAnggota: anggota.id,
                pesan: pesan,
                balasanAi: balasan || ''
              }
            });
          }
        } catch (logErr) {
          console.warn('Gagal menyimpan ChatSession:', logErr.message);
        }
      };

      // Ambil Riwayat Chat Session dari DB (Konteks Memori AI)
      let chatHistoryContext = "";
      try {
        if (anggota) {
          const pastChats = await prisma.chatSession.findMany({
            where: { idAnggota: anggota.id },
            orderBy: { createdAt: "desc" },
            take: 20
          });
          const sortedChats = pastChats.reverse();
          chatHistoryContext = sortedChats.map(c => 
            `User: ${c.pesan}\nAI: ${c.balasanAi}`
          ).join("\n");
        }
      } catch (historyErr) {
        console.log(`⚠️ Gagal mengambil riwayat chat: ${historyErr.message}`);
      }

      // ===== AMBIL KOMODITAS REAL DARI DATABASE (Anti-Halusinasi) =====
      let komoditasRealList = [];
      try {
        const petaniList = await prisma.anggota.findMany({
          where: { status: 'aktif', komoditas: { not: null } },
          select: { komoditas: true }
        });
        komoditasRealList = [...new Set(
          petaniList.map(p => p.komoditas).filter(k => k && k !== '-')
        )];
      } catch(e) {
        console.warn('Gagal ambil komoditas dari DB:', e.message);
      }
      const komoditasContext = komoditasRealList.length > 0
        ? `Komoditas yang BENAR-BENAR tersedia di database petani kami saat ini: ${komoditasRealList.join(', ')}.`
        : 'Data komoditas sedang tidak tersedia.';

      // ===== COMPLIANCE: UU PDP Opt-In =====
      const promptKimi = `[ABAIKAN SEMUA PERCAKAPAN SEBELUMNYA. INI ADALAH SESI BARU DARI PENGGUNA WHATSAPP YANG BERBEDA]
Tugasmu adalah menganalisis pesan WhatsApp ini: "${text}".
Konteks Pengguna: [${profilContext}]
PENTING - DATA STOK RIIL: [${komoditasContext}]

Riwayat Percakapan Terakhir:
[${chatHistoryContext || "Belum ada percakapan sebelumnya."}]

ATURAN PERCAKAPAN & AGENTIC WORKFLOW:
1. Pahami istilah lokal/slang pertanian desa:
   - "bako" -> Tembakau, "gabah" -> Padi, "kilo" -> kg.
   - Satuan: "karung" (dianggap 50 kg), "kuintal" (dianggap 100 kg), "ton" (dianggap 1000 kg). Konversikan otomatis jumlahnya ke satuan kg jika mendeteksi karung/kuintal/ton untuk penawaran/pesanan.
2. ATURAN MISSING PARAMETER & KONTEKS MEMORI:
   - Gunakan "Riwayat Percakapan Terakhir" di atas untuk memahami konteks jika pesan saat ini sangat pendek atau kelanjutan dari chat sebelumnya (contoh: jika di riwayat user menyatakan ingin membeli/mencari Beras, lalu sekarang mengetik "10kg", maka tafsirkan ini sebagai aksi memesan Beras sejumlah 10 kg).
   - Jika pengguna berniat menjual (Offer) atau memesan (Order) tetapi TIDAK menyebutkan detail jumlah atau satuannya secara jelas baik di pesan sekarang maupun riwayat sebelumnya, maka JANGAN klasifikasikan sebagai aksi 1 atau 2. Klasifikasikan ke Pilihan Aksi 14 (PERTANYAAN UMUM LAINNYA).
   - Jika pengguna ingin meminjam uang, mengajukan kredit, butuh modal, minjam modal koperasi (contoh: "pinjam uang 1jt", "butuh modal satu juta untuk pupuk"), maka wajib diklasifikasikan sebagai Pilihan Aksi 13 (APPLY_LOAN) dengan amount sesuai nominal angka.
   - Jika pengguna menggunakan kata referensial seperti "dari dia", "itu", "yang tadi", "yang itu", atau hanya menyebutkan angka tanpa konteks jelas, dan riwayat chat menunjukkan ada nama petani/supplier yang baru disebutkan, maka:
     a) Jika konteksnya pembelian (pengguna adalah SPPG / pembeli), klasifikasikan sebagai isOrder dengan produk/items dari riwayat chat.
     b) Jika konteksnya penjualan (pengguna adalah Petani / penjual), klasifikasikan sebagai isOffer dengan produk/items dari riwayat chat.
     c) Jangan pernah meminta klarifikasi ulang jika informasi (produk, petani, atau supplier) sudah tersedia di riwayat percakapan.
3. ATURAN TEBAK GENDER & SAPAAN (WAJIB):
   - Tebak gender pengguna ("gender": "Laki-laki" | "Perempuan" | "Netral") dan sapaan yang paling sopan sesuai dialek atau cara bicaranya ("sapaan": "Pak" | "Bu" | "Mbah" | "Mas" | "Mbak" | "Kakak" | "Aki" | "Ceceu").
   - Tebak berdasarkan namanya ("${anggota?.nama || msg.pushName}"), sapaan diri ("bapak"/"ibu"/"mamah"/"abah"), atau nada chat-nya. 
   - Wajib sertakan dua key ini ("gender" dan "sapaan") di dalam JSON objek root yang kamu kembalikan untuk SEMUA jenis Pilihan Aksi (1 sampai 14).
4. ATURAN RESPONS (PENTING):
   - JANGAN PERNAH MENYEBUTKAN KATA "AI", "KIMI", "GEMINI", "BOT", ATAU "SISTEM" DI SETIAP RESPONS/REPLY CHAT KAMU.
   - Bicaralah sebagai petugas koperasi desa (Kopdes) manusia yang ramah, sopan, dan membumi dengan bahasa yang sangat sederhana, pendek, tidak formal, dan mudah dimengerti orang tua/petani desa.
5. ATURAN KONFIRMASI BAHASA DESA (SANGAT PENTING):
   - Jika pengguna membalas tawaran/pesanan dengan kata persetujuan, kesediaan, kesanggupan, atau konfirmasi positif dalam bahasa Indonesia/Jawa/Sunda maupun slang (seperti: "ya", "oke", "siap", "bisa", "sanggup", "gas", "y", "boleh", "monggo", "leres", "muhun", "kirim besok", "siap pak", dll), maka wajib diklasifikasikan sebagai Pilihan Aksi 5 (CONFIRM_TRANSACTION) dengan status "SETUJU".
   - Jika pengguna membalas dengan penolakan atau ketidaksanggupan (seperti: "tidak", "enggak", "t", "batal", "tolak", "mboten", "gak bisa", dll), maka wajib diklasifikasikan sebagai Pilihan Aksi 5 (CONFIRM_TRANSACTION) dengan status "TOLAK".
   - Jika pengguna hanya membalas dengan sebuah ANGKA (misal: "141", "138") atau menyebutkan angka ID pesanan, maka WAJIB diklasifikasikan sebagai Pilihan Aksi 5 (CONFIRM_TRANSACTION) dengan status "DITERIMA" dan isi orderId dengan angka tersebut. KECUALI jika riwayat percakapan terakhir menunjukkan AI baru saja menampilkan daftar pesanan dan menanyakan 'Yang mana yang mulai dikirim?', maka klasifikasikan sebagai Pilihan Aksi 6 (DEPART_ORDER) dengan orderId dari angka tersebut.
6. Pilih aksi yang paling tepat dan kembalikan HANYA JSON murni (jangan gunakan markdown block).

Pilihan Aksi (Pilih salah satu):
1. PESANAN (SPPG butuh beli):
{"isOrder": true, "isOffer": false, "action": "none", "items": [{"produk": "Beras", "jumlah": 50, "satuan": "kg"}], "gender": "Laki-laki", "sapaan": "Pak"}
2. PENAWARAN (Petani mau jual):
{"isOrder": false, "isOffer": true, "action": "none", "items": [{"produk": "Telur", "jumlah": 10, "satuan": "kg"}], "gender": "Laki-laki", "sapaan": "Pak"}
3. CEK SALDO (Anggota ingin tahu sisa uang/tabungannya):
{"isOrder": false, "isOffer": false, "action": "CHECK_BALANCE", "gender": "Laki-laki", "sapaan": "Pak"}
4. TARIK TUNAI / CAIRKAN UANG (Anggota ingin mengambil/mencairkan uang):
{"isOrder": false, "isOffer": false, "action": "WITHDRAW", "amount": 50000, "gender": "Laki-laki", "sapaan": "Pak"}
5. KONFIRMASI ORDER / PERSETUJUAN (Petani menyetujui/menolak tawaran atau SPPG menerima barang):
{"isOrder": false, "isOffer": false, "action": "CONFIRM_TRANSACTION", "status": "SETUJU" | "TOLAK" | "DITERIMA", "orderId": 12, "gender": "Laki-laki", "sapaan": "Pak"}
6. BARANG BERANGKAT / DI JALAN (Petani mulai mengirim barang/pesanan):
{"isOrder": false, "isOffer": false, "action": "DEPART_ORDER", "orderId": 12, "gender": "Laki-laki", "sapaan": "Pak"}
7. CEK DAFTAR SPPG (Lokasi/Daftar SPPG):
{"isOrder": false, "isOffer": false, "action": "GET_SPPG", "gender": "Laki-laki", "sapaan": "Pak"}
8. CEK CUACA PERTANIAN:
{"isOrder": false, "isOffer": false, "action": "GET_WEATHER", "query": "Nama Daerah", "gender": "Laki-laki", "sapaan": "Pak"}
9. CEK HARGA PASAR NASIONAL:
{"isOrder": false, "isOffer": false, "action": "GET_MARKET_PRICE", "query": "Nama Komoditas", "gender": "Laki-laki", "sapaan": "Pak"}
10. CEK JARAK LOKASI:
{"isOrder": false, "isOffer": false, "action": "GET_DISTANCE", "query": "Lokasi Tujuan", "gender": "Laki-laki", "sapaan": "Pak"}
11. CARI SUPPLIER/PETANI TERDEKAT (Untuk Admin SPPG mencari petani):
{"isOrder": false, "isOffer": false, "action": "GET_CLOSEST_SUPPLIERS", "query": "Nama Komoditas", "gender": "Laki-laki", "sapaan": "Pak"}
12. CEK STATISTIK WILAYAH (Jumlah koperasi, NIB, NPWP, RAT, Simpanan, Transaksi, dll, di suatu Provinsi atau Kabupaten):
{"isOrder": false, "isOffer": false, "action": "GET_REGIONAL_STATS", "query": "Nama Provinsi atau Kabupaten", "gender": "Laki-laki", "sapaan": "Pak"}
13. AJUKAN PINJAMAN RENTENG (Anggota ingin meminjam modal koperasi secara Tanggung Renteng):
{"isOrder": false, "isOffer": false, "action": "APPLY_LOAN", "amount": 1000000, "gender": "Laki-laki", "sapaan": "Pak"}
14. PERTANYAAN UMUM LAINNYA:
{"isOrder": false, "isOffer": false, "action": "none", "reply": "Jawaban natural kamu...", "gender": "Laki-laki", "sapaan": "Pak"}`;

      const kimiResponse = await askAI(promptKimi);
      if (!kimiResponse) {
         await sock.sendMessage(from, { text: `Mohon maaf, sistem saat ini sedang sibuk. Silakan coba beberapa saat lagi.` });
         continue;
      }

      let data = null;
      try {
        const cleanJson = kimiResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
        data = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.warn("⚠️ Kimi Response Syntax Error. Meminta Gemini untuk memproses ulang...", parseErr.message);
        try {
          const geminiResponse = await askGemini(promptKimi);
          if (geminiResponse) {
            const cleanGeminiJson = geminiResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
            data = JSON.parse(cleanGeminiJson);

          }
        } catch (geminiParseErr) {
          console.error("❌ Gemini Fallback juga gagal mem-parse JSON:", geminiParseErr.message);
        }
      }

      if (!data) {
         await sock.sendMessage(from, { text: `Mohon maaf, AI mengalami kesulitan format data. Silakan ulangi pesan Anda.` });
         continue;
      }

      if (anggota && data) {
        const guessedGender = data.gender;
        const guessedSapaan = data.sapaan;
        if (guessedGender && guessedSapaan && (!anggota.gender || !anggota.sapaan)) {
          try {
            await prisma.anggota.update({
              where: { id: anggota.id },
              data: {
                gender: guessedGender,
                sapaan: guessedSapaan
              }
            });

            anggota.gender = guessedGender;
            anggota.sapaan = guessedSapaan;
          } catch (dbErr) {
            console.warn("Gagal update gender anggota:", dbErr.message);
          }
        }
      }

      try {

         if (data.action === "CHECK_BALANCE") {

          try {
              const res = await fetch(`http://localhost:4444/transaksi/saldo?noWa=${from.split('@')[0]}`);
              const saldoData = await res.json();
              if(saldoData.success) {
                  const replyText = `💰 Saldo Anda saat ini adalah Rp ${Number(saldoData.saldo).toLocaleString('id-ID')}\n\nKetik TARIK [NOMINAL] (atau bilang "cairkan uang [nominal]") untuk melakukan pencairan.`;
                  await sock.sendMessage(from, { text: replyText });
                  await saveChatSession(text, replyText);
              } else {
                  await sock.sendMessage(from, { text: `Nomor Anda belum terdaftar.` });
              }
          } catch(e) {
              await sock.sendMessage(from, { text: `Gagal mengecek saldo.` });
          }
        } else if (data.action === "WITHDRAW") {

          const nominal = Number(data.amount);
          if(isNaN(nominal) || nominal <= 0) {
              await sock.sendMessage(from, { text: `Nominal penarikan tidak valid. Mohon sebutkan nominal angka dengan jelas (contoh: tarik 50000).` });
              continue;
          }
          
          // Double Confirmation Flow
          pendingWithdrawals.set(from, nominal);
          const sapaanText = data.sapaan || "Bapak/Ibu";
          const confirmText = `Bapak/Ibu ${sapaanText} ingin mengambil tabungan sebesar Rp ${nominal.toLocaleString('id-ID')}, leres nggih? Balas *YA* untuk melanjutkan.`;
          await sock.sendMessage(from, { text: confirmText });
          await saveChatSession(text, confirmText);
        } else if (data.action === "APPLY_LOAN") {
          const nominal = Number(data.amount);
          if (isNaN(nominal) || nominal <= 0) {
            await sock.sendMessage(from, { text: `Nominal pinjaman tidak valid. Mohon sebutkan nominal angka dengan jelas (contoh: pinjam 1.000.000).` });
            continue;
          }

          if (anggota.creditScore < 50) {
            const lowScoreMsg = `Mohon maaf ${anggota.sapaan || 'Bapak/Ibu'} ${anggota.nama?.split(' ')[0] || ''}, saat ini pengajuan pinjaman belum bisa diproses karena nilai keaktifan (*Credit Score*) Anda baru ${anggota.creditScore}/100 (minimal 50).\n\nTingkatkan transaksi penjualan hasil tani Anda ke SPPG untuk menaikkan credit score.`;
            await sock.sendMessage(from, { text: lowScoreMsg });
            continue;
          }

          try {
            // 1. Buat record pinjaman pending di database
            const pinjaman = await prisma.pinjaman.create({
              data: {
                idAnggota: anggota.id,
                jumlah: nominal,
                status: 'pending'
              }
            });

            // 2. Cari seluruh anggota koperasi aktif lainnya di koperasi yang sama
            const peers = await prisma.anggota.findMany({
              where: {
                idKoperasi: anggota.idKoperasi,
                status: 'aktif',
                id: { not: anggota.id }
              }
            });

            if (peers.length === 0) {
              // Fallback jika tidak ada rekan kelompok
              await prisma.pinjaman.update({
                where: { id: pinjaman.id },
                data: { status: 'disetujui' }
              });
              await prisma.anggota.update({
                where: { id: anggota.id },
                data: { saldo: { increment: nominal } }
              });
              const directDisburse = `Pengajuan pinjaman modal sebesar Rp ${nominal.toLocaleString('id-ID')} telah langsung dicairkan ke saldo Koperasi Anda karena belum ada kelompok penjamin terdaftar.`;
              await sock.sendMessage(from, { text: directDisburse });
              await saveChatSession(text, directDisburse);
              continue;
            }

            // 3. Masukkan ke state pending di memori
            const penjaminJids = peers.map(p => {
              let f = p.noWhatsapp;
              if (f.startsWith("0")) f = "62" + f.substring(1);
              return `${f}@s.whatsapp.net`;
            });

            pendingRentengLoans.set(pinjaman.id, {
              borrowerWa: from,
              borrowerNama: anggota.nama,
              jumlah: nominal,
              penjaminJids,
              approvals: new Set()
            });

            // 4. Kirim konfirmasi ke borrower
            const sapaanText = anggota.sapaan || "Bapak/Ibu";
            const initMsg = `Pengajuan pinjaman Tanggung Renteng Rp ${nominal.toLocaleString('id-ID')} berhasil diajukan. Koperasi sedang meminta persetujuan dari ${peers.length} rekan satu kelompok Anda di Jakarta. Mohon tunggu.`;
            await sock.sendMessage(from, { text: initMsg });
            await saveChatSession(text, initMsg);

            // 5. Blast ke rekan kelompok
            const blastMsg = `📢 *[TANGGUNG RENTENG - PERSETUJUAN KREDIT]* 📢\n\n`
              + `Halo Bapak/Ibu, rekan satu kelompok koperasi Anda:\n`
              + `👤 Nama: *${anggota.nama}*\n`
              + `💰 Nominal Pinjaman: *Rp ${nominal.toLocaleString('id-ID')}*\n\n`
              + `Apakah Anda bersedia menjadi penjamin dan menanggung risiko pinjaman ini bersama secara Tanggung Renteng?\n\n`
              + `Ketik: *SETUJU PINJAMAN ${pinjaman.id}* atau *TOLAK PINJAMAN ${pinjaman.id}*`;

            for (const jid of penjaminJids) {
              await sock.sendMessage(jid, { text: blastMsg });
            }

          } catch (dbErr) {
            console.error("Gagal memproses pinjaman renteng:", dbErr.message);
            await sock.sendMessage(from, { text: `Mohon maaf, sistem mengalami kendala.` });
          }
        } else if (data.action === "CONFIRM_TRANSACTION") {

          const status = String(data.status).toUpperCase();
          
          // FIX: Jika user membalas angka dan sebelumnya sedang dalam mode pending departure,
          // maka intercept DITERIMA dan route ke DEPART_ORDER
          if (status === "DITERIMA" && pendingDepartures.has(from)) {
            const idOrder = data.orderId ? Number(data.orderId) : null;
            pendingDepartures.delete(from);
            try {
              const res = await fetch(`http://localhost:4444/transaksi/berangkat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idOrder, noWa: from.split('@')[0] })
              });
              const resData = await res.json();
              const replyText = resData.success ? `🚚 ${resData.message}` : `${resData.message}`;
              await sock.sendMessage(from, { text: replyText });
              await saveChatSession(text, replyText);
            } catch(e) {
              await sock.sendMessage(from, { text: `Terjadi kesalahan saat memproses keberangkatan.` });
            }
          } else if (status === "SETUJU" || status === "TOLAK") {
             try {
                const res = await fetch(`http://localhost:4444/ai/blast/reply`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                      noWhatsapp: from.split('@')[0], 
                      jawaban: status,
                      idOrder: data.orderId ? Number(data.orderId) : null
                    })
                });
                const resData = await res.json();
                const replyText = resData.success ? `${resData.message}` : `${resData.message}`;
                await sock.sendMessage(from, { text: replyText });
                await saveChatSession(text, replyText);
             } catch(e) {
                await sock.sendMessage(from, { text: `Terjadi kesalahan saat memproses balasan Anda.` });
             }
          } else if (status === "DITERIMA") {
             const idOrder = data.orderId ? Number(data.orderId) : null;
             
             // BUG 1 FIX: Jika petani (bukan Admin SPPG/Juri) trigger DITERIMA, arahkan ke berangkat bukan selesai
             const senderKategori = anggota ? anggota.kategoriUsaha : null;
             const isAdminSppgOrJuri = senderKategori === "Admin SPPG" || senderKategori === "Juri";
             
             if (!isAdminSppgOrJuri) {
               // Petani bilang "sudah dikirim" → route ke berangkat
               try {
                  const res = await fetch(`http://localhost:4444/transaksi/berangkat`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ idOrder, noWa: from.split('@')[0] })
                  });
                  const resData = await res.json();
                  let replyText = "";
                  if (resData.success) {
                     replyText = `🚚 ${resData.message}`;
                  } else if (resData.data && resData.data.multiple) {
                     const listOrders = resData.data.orders.map(o => `[${o.id}] ${o.jumlah} ${o.satuan} ${o.produk}`).join("\n");
                     replyText = `Bapak/Ibu punya beberapa pesanan aktif yang siap dikirim:\n${listOrders}\n\nYang mana yang mulai dikirim? (Balas dengan angkanya saja, contoh: 141).`;
                     pendingDepartures.set(from, "AWAITING_SELECTION");
                  } else {
                     replyText = `${resData.message}`;
                  }
                  await sock.sendMessage(from, { text: replyText });
                  await saveChatSession(text, replyText);
               } catch(e) {
                  await sock.sendMessage(from, { text: `Terjadi kesalahan saat memproses keberangkatan.` });
               }
             } else {
               // Admin SPPG / Juri konfirmasi barang sudah diterima → route ke selesai
               try {
                  const res = await fetch(`http://localhost:4444/transaksi/selesai`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ idOrder, noWa: from.split('@')[0] })
                  });
                  const resData = await res.json();
                  
                  let replyText = "";
                  if (resData.success) {
                     replyText = `${resData.message}`;
                  } else if (resData.data && resData.data.multiple) {
                     const listOrders = resData.data.orders.map(o => `[${o.id}] ${o.jumlah} ${o.satuan} ${o.produk}`).join("\n");
                     replyText = `Bapak/Ibu punya beberapa pesanan yang sedang dikirim:\n${listOrders}\n\nYang mana yang sudah sampai? (Balas dengan angkanya saja, contoh: 141).`;
                  } else {
                     replyText = `${resData.message}`;
                  }
                  
                  await sock.sendMessage(from, { text: replyText });
                  await saveChatSession(text, replyText);
               } catch(e) {
                  await sock.sendMessage(from, { text: `Terjadi kesalahan saat konfirmasi penerimaan.` });
               }
             }
          }
        } else if (data.action === "DEPART_ORDER") {

          // FIX: Cek apakah user sebelumnya sedang dalam mode pemilihan order keberangkatan
          let idOrder = data.orderId ? Number(data.orderId) : null;
          
          // Jika AI detect angka (DITERIMA) tapi user sedang dalam mode pending departure, override ke DEPART
          if (!idOrder && pendingDepartures.has(from)) {
            idOrder = pendingDepartures.get(from);
            pendingDepartures.delete(from);
          }

          try {
             const res = await fetch(`http://localhost:4444/transaksi/berangkat`, {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ idOrder, noWa: from.split('@')[0] })
             });
             const resData = await res.json();
             
             let replyText = "";
             if (resData.success) {
                replyText = `🚚 ${resData.message}`;
                pendingDepartures.delete(from); // bersihkan state
             } else if (resData.data && resData.data.multiple) {
                const listOrders = resData.data.orders.map(o => `[${o.id}] ${o.jumlah} ${o.satuan} ${o.produk}`).join("\n");
                replyText = `Bapak/Ibu punya beberapa pesanan aktif yang siap dikirim:\n${listOrders}\n\nYang mana yang mulai dikirim? (Balas dengan angkanya saja, contoh: 141).`;
                // FIX: simpan state bahwa user lagi milih order keberangkatan
                pendingDepartures.set(from, "AWAITING_SELECTION");
             } else {
                replyText = `${resData.message}`;
             }
             
             await sock.sendMessage(from, { text: replyText });
             await saveChatSession(text, replyText);
           } catch(e) {
              await sock.sendMessage(from, { text: `Terjadi kesalahan saat memproses keberangkatan.` });
           }
        } else if (data.action === "GET_SPPG") {

          if (!idKoperasiUser) {
             await sock.sendMessage(from, { text: "Mohon maaf, Anda harus terdaftar di sebuah Koperasi untuk melihat daftar SPPG." });
             continue;
          }
          const sppgs = await prisma.sppg.findMany({ 
              where: { idKoperasi: idKoperasiUser },
              take: 10 // LIMIT KE 10 agar token AI Kimi tidak meledak (kita punya 29.000 SPPG!)
          });
          const listSppg = sppgs.map((s, idx) => `${idx + 1}. ${s.namaSppg} (${s.alamat})`).join("\n");
          

          const pass2Prompt = `[ABAIKAN SEMUA PERCAKAPAN SEBELUMNYA. INI ADALAH SESI BARU]
Pengguna bertanya: "${text}".
Sistem database mengembalikan data SPPG berikut:
${listSppg}

Berikan jawaban pendek, ramah, dan gunakan penomoran angka (1, 2, 3) untuk daftar. Jangan pakai kata 'terdekat' di respons Anda. Gunakan kalimat yang singkat dan mudah dimengerti orang tua.`;
          const kimiPass2 = await askAI(pass2Prompt);
          const replyText = (kimiPass2 || "Gagal mengambil data SPPG. Silakan coba lagi.").replace(/"/g, "'");
          await sock.sendMessage(from, { text: replyText });
          await saveChatSession(text, replyText);
        } else if (data.action === "GET_WEATHER") {

          const { WeatherMcp } = await import("./src/services/mcp/WeatherMcp.ts");
          const cuaca = await WeatherMcp.getWeather(data.query || "Jawa Tengah");
          const pass2Prompt = `[ABAIKAN SEMUA PERCAKAPAN SEBELUMNYA. INI ADALAH SESI BARU]\nPengguna bertanya: "${text}".\nSistem MCP Cuaca mengembalikan: ${JSON.stringify(cuaca)}\nBerikan jawaban natural ke pengguna berdasarkan data ini.`;
          const kimiPass2 = await askAI(pass2Prompt);
          const replyText = (kimiPass2 || "Gagal mendapatkan data cuaca.").replace(/"/g, "'");
          await sock.sendMessage(from, { text: replyText });
          await saveChatSession(text, replyText);
        } else if (data.action === "GET_MARKET_PRICE") {

          const { MarketPriceMcp } = await import("./src/services/mcp/MarketPriceMcp.ts");
          const harga = MarketPriceMcp.getPrice(data.query || "Beras");
          const pass2Prompt = `[ABAIKAN SEMUA PERCAKAPAN SEBELUMNYA. INI ADALAH SESI BARU]\nPengguna bertanya: "${text}".\nSistem MCP Harga Pasar Bapanas mengembalikan: ${JSON.stringify(harga)}\nBerikan jawaban natural ke pengguna berdasarkan data ini.`;
          const kimiPass2 = await askAI(pass2Prompt);
          const replyText = (kimiPass2 || "Gagal mendapatkan data harga.").replace(/"/g, "'");
          await sock.sendMessage(from, { text: replyText });
          await saveChatSession(text, replyText);
        } else if (data.action === "GET_DISTANCE") {

          const { MapsMcp } = await import("./src/services/mcp/MapsMcp.ts");
          const jarak = await MapsMcp.getDistance("Lokasi Pengguna", data.query || "SPPG");
          const pass2Prompt = `[ABAIKAN SEMUA PERCAKAPAN SEBELUMNYA. INI ADALAH SESI BARU]\nPengguna bertanya: "${text}".\nSistem MCP Maps mengembalikan: ${JSON.stringify(jarak)}\nBerikan jawaban natural ke pengguna berdasarkan data ini.`;
          const kimiPass2 = await askAI(pass2Prompt);
          const replyText = (kimiPass2 || "Gagal mendapatkan data jarak.").replace(/"/g, "'");
          await sock.sendMessage(from, { text: replyText });
          await saveChatSession(text, replyText);
        } else if (data.action === "GET_REGIONAL_STATS") {

          const queryUpper = (data.query || "").toUpperCase().trim();
          let statsText = "";
          
          const prov = await prisma.provinsi.findFirst({
            where: { nama: { contains: queryUpper } }
          });
          
          if (prov) {
            statsText = `Statistik Koperasi Provinsi *${prov.nama}*:\n`
              + `- Jumlah Koperasi: *${prov.jumlahKoperasi.toLocaleString('id-ID')}*\n`
              + `- Memiliki NIB: *${prov.nibCount.toLocaleString('id-ID')}*\n`
              + `- Memiliki NPWP: *${prov.npwpCount.toLocaleString('id-ID')}*\n`
              + `- Telah RAT (2025): *${prov.ratCount.toLocaleString('id-ID')}*\n`
              + `- Simpanan Pokok: *Rp ${Number(prov.simpananPokok).toLocaleString('id-ID')}*\n`
              + `- Simpanan Wajib: *Rp ${Number(prov.simpananWajib).toLocaleString('id-ID')}*\n`
              + `- Volume Transaksi (2026): *${prov.volumeTransaksi.toLocaleString('id-ID')}*\n`
              + `- Nilai Transaksi (2026): *Rp ${Number(prov.nilaiTransaksi).toLocaleString('id-ID')}*\n`
              + `- RAT Dilaporkan: *${prov.ratReported.toLocaleString('id-ID')}*\n`
              + `- RAT Diverifikasi Dinas: *${prov.ratVerified.toLocaleString('id-ID')}*\n`
              + `- Sedang RAT (draft): *${prov.ratDraft.toLocaleString('id-ID')}*\n`
              + `- Belum RAT: *${prov.ratNone.toLocaleString('id-ID')}*`;
          } else {
            const kab = await prisma.kabupaten.findFirst({
              where: { nama: { contains: queryUpper } },
              include: { provinsi: true }
            });
            
            if (kab) {
              statsText = `Statistik Koperasi *${kab.nama}* (Provinsi *${kab.provinsi.nama}*):\n`
                + `- Jumlah Koperasi: *${kab.jumlahKoperasi.toLocaleString('id-ID')}*\n`
                + `- Memiliki NIB: *${kab.nibCount.toLocaleString('id-ID')}*\n`
                + `- Memiliki NPWP: *${kab.npwpCount.toLocaleString('id-ID')}*\n`
                + `- Telah RAT (2025): *${kab.ratCount.toLocaleString('id-ID')}*\n`
                + `- Simpanan Pokok: *Rp ${Number(kab.simpananPokok).toLocaleString('id-ID')}*\n`
                + `- Simpanan Wajib: *Rp ${Number(kab.simpananWajib).toLocaleString('id-ID')}*\n`
                + `- Volume Transaksi (2026): *${kab.volumeTransaksi.toLocaleString('id-ID')}*\n`
                + `- Nilai Transaksi (2026): *Rp ${Number(kab.nilaiTransaksi).toLocaleString('id-ID')}*\n`
                + `- RAT Dilaporkan: *${kab.ratReported.toLocaleString('id-ID')}*\n`
                + `- RAT Diverifikasi Dinas: *${kab.ratVerified.toLocaleString('id-ID')}*\n`
                + `- Sedang RAT (draft): *${kab.ratDraft.toLocaleString('id-ID')}*\n`
                + `- Belum RAT: *${kab.ratNone.toLocaleString('id-ID')}*`;
            } else {
              statsText = `Maaf, data wilayah *${data.query}* tidak ditemukan di sistem kami.`;
            }
          }
          
          await sock.sendMessage(from, { text: statsText });
          await saveChatSession(text, statsText);
        } else if (data.action === "GET_CLOSEST_SUPPLIERS") {

          if (!idKoperasiUser) {
             await sock.sendMessage(from, { text: "Mohon maaf, Anda harus terdaftar di sebuah Koperasi untuk mencari supplier terdekat." });
             continue;
          }
          
          const komoditasTarget = data.query || "Beras";
          const { MapsMcp } = await import("./src/services/mcp/MapsMcp.ts");
          
          const petaniList = await prisma.anggota.findMany({
            where: {
              idKoperasi: idKoperasiUser,
              kategoriUsaha: "Pertanian",
              komoditas: { contains: komoditasTarget }
            },
            include: { koperasi: true }
          });

          const petaniDenganJarak = await Promise.all(petaniList.map(async (petani) => {
            try {
              const alamatPetani = petani.alamat || ("Gudang Petani " + petani.nama);
              const jarakInfo = await MapsMcp.getDistance("Dapur SPPG Pusat", alamatPetani);
              return {
                nama: petani.nama,
                noWhatsapp: petani.noWhatsapp,
                komoditas: petani.komoditas,
                jarak: jarakInfo?.estimasi_jarak_km ?? 999,
                alamat: petani.alamat || `Gudang Petani ${petani.nama}`,
                namaKoperasi: petani.koperasi?.namaKoperasi || "Koperasi"
              };
            } catch (err) {
              return {
                nama: petani.nama,
                noWhatsapp: petani.noWhatsapp,
                komoditas: petani.komoditas,
                jarak: 999,
                alamat: petani.alamat || `Gudang Petani ${petani.nama}`,
                namaKoperasi: petani.koperasi?.namaKoperasi || "Koperasi"
              };
            }
          }));

          const terdekat = petaniDenganJarak
            .filter((a) => a.jarak <= 10)
            .sort((a, b) => a.jarak - b.jarak)
            .slice(0, 3);

          const listPetaniStr = terdekat.length > 0 
            ? terdekat.map((p, idx) => {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.alamat)}`;
                return `${idx + 1}. Nama: *${p.nama}* (Anggota *${p.namaKoperasi}*) - No WA: ${p.noWhatsapp}\n`
                     + `   Jarak: *${p.jarak} km*\n`
                     + `   Lokasi Maps: ${mapsUrl}`;
              }).join("\n\n")
            : "Tidak ada petani terdekat yang menyediakan komoditas tersebut.";

          const pass2Prompt = `[ABAIKAN SEMUA PERCAKAPAN SEBELUMNYA. INI ADALAH SESI BARU]
Pengguna (Admin SPPG) bertanya mencari supplier.
Berikut data supplier dari database:
${listPetaniStr}

ATURAN FORM FORMATTING:
1. JANGAN PERNAH gunakan bintang ganda (**text**). Gunakan HANYA bintang tunggal (*text*) untuk cetak tebal di WhatsApp (contoh: *Bapak Surya*).
2. JANGAN gunakan em-dash (—) atau tanda hubung panjang.
3. Informasikan nama supplier, asal koperasi, jarak, nomor WhatsApp, serta sertakan link Google Maps lokasi mereka secara lengkap dan utuh.
4. Jawab dengan sangat ramah, santai, singkat, dan tidak bertele-tele.`;
          const kimiPass2 = await askAI(pass2Prompt);
          const replyText = (kimiPass2 || "Gagal mendapatkan data supplier.").replace(/"/g, "'");
          await sock.sendMessage(from, { text: replyText });
          await saveChatSession(text, replyText);
        } else if (data.isOrder && data.items && data.items.length > 0) {
          // 1. LOGIKA PESANAN (SPPG MEMBUTUHKAN BARANG)
          try {
            let detailPesanan = "";
            let idx = 1;
            for (const item of data.items) {
                if(!item.produk || !item.jumlah || !item.satuan) continue;
                await fetch("http://localhost:4444/kebutuhan", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    noWaSppg: from.split('@')[0], 
                    produk: item.produk.toUpperCase(),
                    jumlah: item.jumlah,
                    satuan: item.satuan.toLowerCase(),
                    hargaMaksimal: 20000 
                  })
                });
                detailPesanan += `${idx}. ${item.jumlah} ${item.satuan} ${item.produk}\n`;
                idx++;
            }
            
            fetch("http://localhost:4444/ai/match", { method: "POST" })
               .then(res => res.json())
               .then(matchResult => {
                   if(matchResult.success) fetch("http://localhost:4444/ai/blast", { method: "POST" });
               }).catch(e => console.error("Error matching async:", e));

             const replyText = `Pesanan belanja bapak/ibu sudah kami catat dan sedang dicarikan petani penyedianya:\n${detailPesanan}\nKami akan memberi kabar jika sudah ada petani yang siap mengirimkannya.`;
             await sock.sendMessage(from, { text: replyText });
             await saveChatSession(text, replyText);
          } catch (err) {
            await sock.sendMessage(from, { text: `Mohon maaf, terjadi kendala pada server kami: ${err.message}` });
          }
        } else if (data.isOffer && data.items && data.items.length > 0) {
          // 2. LOGIKA PENAWARAN (REVERSE MATCHING: PETANI -> SPPG)
            let detailTawaran = data.items.map((i, idx) => `${idx + 1}. ${i.jumlah} ${i.satuan} ${i.produk}`).join("\n");
            
            // Simpan stok panen petani ke database (tb_produksi_harian)
            try {
              if (anggota && anggota.id) {
                for (const item of data.items) {
                  await prisma.produksiHarian.create({
                    data: {
                      idAnggota: anggota.id,
                      tanggal: new Date(),
                      jumlahProduksi: Number(item.jumlah || 0),
                      jumlahTersedia: Number(item.jumlah || 0),
                      satuan: item.satuan || "kg",
                      status: "tersedia"
                    }
                  });
                }
                console.log(`🌾 Berhasil mencatat ${data.items.length} data produksi harian baru untuk ${anggota.nama}`);
              }
            } catch (dbErr) {
              console.error("Gagal mencatat produksi harian:", dbErr.message);
            }

            await sock.sendMessage(from, { text: `Panen bapak/ibu sudah dicatat ke sistem Koperasi. Kami sedang mencarikan pembelinya ya:\n${detailTawaran}\n\nMohon ditunggu sebentar ya.` });

          try {
            // Cari Admin SPPG yang tergabung dalam Koperasi yang sama
            const adminSppgs = await prisma.anggota.findMany({
               where: { idKoperasi: idKoperasiUser, kategoriUsaha: "Admin SPPG" }
            });

            const { MapsMcp } = await import("./src/services/mcp/MapsMcp.ts");
            const sentJids = new Set();

            // Paralel Blast ke semua Admin SPPG
            await Promise.all(adminSppgs.map(async (admin) => {
                // MCP Hitung Jarak dengan Safe Error Handling
                let jarakInfo = null;
                try {
                   const alamatPetani = anggota?.alamat || "Gudang Petani";
                   jarakInfo = await MapsMcp.getDistance(alamatPetani, "Dapur SPPG " + admin.nama);
                } catch (mapErr) {
                   console.error("Error calculating distance:", mapErr);
                }
                 
                const estimasiJarak = jarakInfo?.estimasi_jarak_km ?? 999;
                 
                // Pastikan format nomor diawali 62
                let formatTarget = admin.noWhatsapp;
                if (!formatTarget) return;
                if (formatTarget.startsWith("0")) formatTarget = "62" + formatTarget.substring(1);
                const targetJid = formatTarget + "@s.whatsapp.net";
                
                if (sentJids.has(targetJid)) return;

                // Jika jarak terlalu jauh, BATALKAN blast ke SPPG ini
                if (estimasiJarak > 10) {

                    return; 
                }

                const pesanBlast = `[STOK PANEN PETANI]\n\n`
                  + `Halo ${admin.nama}, petani di sekitar bapak/ibu memiliki panen siap jual:\n\n${detailTawaran}\n\n`
                  + `Jarak gudang petani hanya ${estimasiJarak} km dari dapur bapak/ibu.\n\n`
                  + `Silakan hubungi petani jika bapak/ibu sedang membutuhkan stok ini.`;


                await sock.sendMessage(targetJid, { text: pesanBlast });
                sentJids.add(targetJid);
            }));

            const replyText = `Tawaran panen bapak/ibu sudah disebarkan ke Dapur SPPG. Mereka akan segera menghubungi jika berminat.`;
            await sock.sendMessage(from, { text: replyText });
            await saveChatSession(text, replyText);
          } catch(err) {
             console.error("Error saat reverse matching:", err);
          }
        } else if (data.isOrder || data.isOffer) {
            await sock.sendMessage(from, { text: `Mohon sebutkan nama komoditas dengan jelas beserta jumlah dan satuannya.` });
        } else {
          // 3. LOGIKA CHAT BIASA (KIMI MENJAWAB)
          const balasanAi = (data.reply || "Maaf, pesan tidak dapat diproses.").replace(/"/g, "'");
          await sock.sendMessage(from, { text: balasanAi });
          await saveChatSession(text, balasanAi);
        }
      } catch (err) {
         await sock.sendMessage(from, { text: `Mohon maaf, terjadi kesalahan dalam membaca pesan Bapak/Ibu.` });
      }
    }
  });

  return sock;
}

export function getSocket() {
  return sock;
}
