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
import { prisma } from "../lib/db.js";

// Setup directory and logger
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_DIR = path.join(__dirname, "..", "session");
const logger = pino({ level: "silent" });

let sock: any = null;

// Normalizing phone number to international format
function normalizePhoneNumber(jid: string): string {
  return jid.replace("@s.whatsapp.net", "").split(":")[0];
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
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("QR Code received. Please scan with WhatsApp.");
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("Device Logged Out, Please Delete Session and Scan Again.");
      } else {
        console.log("Connection closed, reconnecting...");
        connectWhatsApp();
      }
    } else if (connection === "open") {
      console.log("WhatsApp connection opened successfully!");
    }
  });

  sock.ev.on("messages.upsert", async (m: any) => {
    try {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const senderJid = msg.key.remoteJid;
      const senderNumber = normalizePhoneNumber(senderJid);
      
      const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
      
      if (!text) return;

      console.log(`[WA] Received from ${senderNumber}: ${text}`);

      // Handle "PINJAM [nominal]"
      if (text.toUpperCase().startsWith("PINJAM ")) {
        const nominalStr = text.substring(7).trim().replace(/[^0-9]/g, "");
        const nominal = parseFloat(nominalStr);

        if (isNaN(nominal) || nominal <= 0) {
          await sock.sendMessage(senderJid, { text: "Format salah. Gunakan: PINJAM [nominal], contoh: PINJAM 1000000" });
          return;
        }

        const anggota = await prisma.anggota.findFirst({
          where: { noWhatsapp: { contains: senderNumber } }
        });

        if (!anggota) {
          await sock.sendMessage(senderJid, { text: "Anda belum terdaftar sebagai anggota Koperasi." });
          return;
        }

        // Create Pinjaman
        const pinjaman = await prisma.pinjaman.create({
          data: {
            idAnggota: anggota.id,
            jumlah: nominal,
            status: "pending",
            tujuan: "Modal Kerja",
            skema: "Tanggung Renteng"
          }
        });

        // Find other members for Tanggung Renteng
        const otherMembers = await prisma.anggota.findMany({
          where: {
            idKoperasi: anggota.idKoperasi,
            id: { not: anggota.id }
          }
        });

        if (otherMembers.length === 0) {
          await sock.sendMessage(senderJid, { text: "Tidak ada anggota lain di Koperasi Anda untuk Tanggung Renteng." });
          return;
        }

        await sock.sendMessage(senderJid, { text: `Pengajuan pinjaman ID ${pinjaman.id} sebesar Rp${nominal} sedang diproses. Menunggu persetujuan kelompok (Tanggung Renteng)...` });

        for (const member of otherMembers) {
          await prisma.votingRenteng.create({
            data: {
              idPinjaman: pinjaman.id,
              idAnggotaPemilih: member.id,
              status: "pending"
            }
          });

          // Simulate or send blast
          const messageBlast = `Apakah Anda bersedia menjamin pinjaman modal ${anggota.nama} sebesar Rp${nominal} secara Tanggung Renteng? Balas SETUJU PINJAMAN ${pinjaman.id}`;
          
          if (member.noWhatsapp) {
            // attempt to send WA
            try {
              let targetJid = member.noWhatsapp;
              if (targetJid.startsWith("0")) targetJid = "62" + targetJid.substring(1);
              targetJid += "@s.whatsapp.net";
              await sock.sendMessage(targetJid, { text: messageBlast });
              console.log(`[BLAST] Sent to ${member.noWhatsapp}: ${messageBlast}`);
            } catch (err) {
              console.error(`[BLAST] Failed to send to ${member.noWhatsapp}`, err);
            }
          } else {
            console.log(`[BLAST SIMULATION] To Member ID ${member.id}: ${messageBlast}`);
          }
        }
      }

      // Handle "SETUJU PINJAMAN [ID]"
      else if (text.toUpperCase().startsWith("SETUJU PINJAMAN ")) {
        const idStr = text.substring(16).trim();
        const pinjamanId = parseInt(idStr, 10);

        if (isNaN(pinjamanId)) {
          await sock.sendMessage(senderJid, { text: "Format ID Pinjaman salah. Contoh: SETUJU PINJAMAN 1" });
          return;
        }

        const pemilih = await prisma.anggota.findFirst({
          where: { noWhatsapp: { contains: senderNumber } }
        });

        if (!pemilih) {
          await sock.sendMessage(senderJid, { text: "Anda belum terdaftar." });
          return;
        }

        const voting = await prisma.votingRenteng.findFirst({
          where: {
            idPinjaman: pinjamanId,
            idAnggotaPemilih: pemilih.id
          },
          include: {
            pinjaman: {
              include: { anggota: true }
            }
          }
        });

        if (!voting) {
          await sock.sendMessage(senderJid, { text: `Pengajuan pinjaman ID ${pinjamanId} tidak ditemukan atau Anda tidak berhak menyetujuinya.` });
          return;
        }

        if (voting.status === "setuju") {
          await sock.sendMessage(senderJid, { text: "Anda sudah menyetujui pinjaman ini sebelumnya." });
          return;
        }

        await prisma.votingRenteng.update({
          where: { id: voting.id },
          data: { status: "setuju", pesanWa: text }
        });

        await sock.sendMessage(senderJid, { text: `Terima kasih, persetujuan Anda untuk Pinjaman ID ${pinjamanId} telah dicatat.` });

        // Check Quorum
        const allVotes = await prisma.votingRenteng.findMany({
          where: { idPinjaman: pinjamanId }
        });

        const totalVoters = allVotes.length;
        const totalSetuju = allVotes.filter((v: any) => v.status === "setuju").length;

        if (totalSetuju >= Math.ceil(totalVoters / 2) && voting.pinjaman.status !== "disetujui") {
          // Quorum reached
          await prisma.pinjaman.update({
            where: { id: pinjamanId },
            data: { status: "disetujui" }
          });

          // Insert into BukuKas
          const lastKas = await prisma.bukuKas.findFirst({
            where: { idKoperasi: pemilih.idKoperasi },
            orderBy: { id: 'desc' }
          });
          const saldoAwal = lastKas ? Number(lastKas.saldoSetelahnya) : 0;
          const nominalPinjaman = Number(voting.pinjaman.jumlah);

          await prisma.bukuKas.create({
            data: {
              idKoperasi: pemilih.idKoperasi,
              uraian: `Pencairan Pinjaman Renteng ID ${pinjamanId} a.n ${voting.pinjaman.anggota.nama}`,
              tipeMutasi: "keluar",
              nominal: nominalPinjaman,
              saldoSetelahnya: saldoAwal - nominalPinjaman
            }
          });

          console.log(`[QUORUM REACHED] Pinjaman ID ${pinjamanId} disetujui. Mutasi kas keluar dicatat.`);

          // Notify the borrower
          let borrowerJid = voting.pinjaman.anggota.noWhatsapp;
          if (borrowerJid) {
            if (borrowerJid.startsWith("0")) borrowerJid = "62" + borrowerJid.substring(1);
            borrowerJid += "@s.whatsapp.net";
            try {
              await sock.sendMessage(borrowerJid, { text: `Selamat! Pinjaman Anda ID ${pinjamanId} sebesar Rp${nominalPinjaman} telah disetujui oleh kelompok dan dana telah dicairkan.` });
            } catch(e) {}
          }
        }
      }

    } catch (error) {
      console.error("[WA MESSAGE ERROR]", error);
    }
  });
}

export function getSocket() {
  return sock;
}
