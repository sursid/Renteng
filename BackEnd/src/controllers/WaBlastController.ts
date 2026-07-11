import { prisma } from "../../lib/db";
import { getSocket } from "../../whatsapp.js";

export const WaBlastController = {
  async blast({ set }: any) {
    try {
      // 1. Ambil matching dengan score lumayan tinggi (>= 0.5) yang BELUM pernah di-blast
      const matchingList = await prisma.aiMatching.findMany({
        where: { 
          score: { gte: 0.5 },
          kebutuhan: { none: {} } // Hanya matching yang belum punya log blast
        },
        include: { 
          anggota: true, 
          order: {
            include: { sppg: true }
          }
        }
      });

      if (matchingList.length === 0) {
        return { success: true, message: "Tidak ada target blast yang cocok", data: { sent: 0, failed: 0 } };
      }

      let sent = 0;
      let failed = 0;
      const sock = getSocket();

      if (!sock) {
        set.status = 503;
        return { success: false, message: "WhatsApp bot belum siap (socket is null)" };
      }

      for (const match of matchingList) {
        const noWa = match.anggota.noWhatsapp;
        const jid = `${noWa}@s.whatsapp.net`;
        const pesan = `Halo ${match.anggota.nama}! 👋\n\nAda pesanan dari SPPG ${match.order.sppg.namaSppg}:\n📦 Produk: ${match.order.produk}\n🔢 Jumlah: ${match.order.jumlah} ${match.order.satuan}\n💰 Harga max: Rp${match.order.hargaMaksimal}\n\nBalas *YA* atau *TIDAK*, atau balas langsung dengan pesan biasa (contoh: "Siap, bisa saya kirim").\n\n_RentengPay Bot_`;

        try {
          // 2. Kirim via WhatsApp
          await sock.sendMessage(jid, { text: pesan });
          sent++;

          // 3. Simpan ke log blast
          await prisma.aiBlastLog.create({
            data: {
              idMatching: match.id,
              pesan,
              statusKirim: "sent"
            }
          });
        } catch (err: any) {
          failed++;
          await prisma.aiBlastLog.create({
            data: {
              idMatching: match.id,
              pesan,
              statusKirim: "failed",
              respon: err.message
            }
          });
        }
      }

      return { success: true, message: "Blast selesai", data: { sent, failed } };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async getLogs({ set }: any) {
    try {
      const data = await prisma.aiBlastLog.findMany({
        include: {
          matching: {
            include: { anggota: true, order: true }
          }
        }
      });
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async replyBlast({ body, set }: any) {
    try {
      const { noWhatsapp, jawaban, idOrder } = body;
      if (!noWhatsapp || !jawaban) {
        set.status = 400;
        return { success: false, message: "Parameter tidak lengkap" };
      }

      // Normalisasi
      let searchNomor = noWhatsapp;
      if (searchNomor.startsWith("62")) searchNomor = searchNomor.substring(2);
      if (searchNomor.startsWith("0")) searchNomor = searchNomor.substring(1);

      // Cari blast log terbaru milik nomor ini yang responnya masih null
      const blastLog = await prisma.aiBlastLog.findFirst({
        where: {
          matching: { 
            anggota: { noWhatsapp: { endsWith: searchNomor } },
            ...(idOrder ? { idOrder: Number(idOrder) } : {})
          },
          respon: null,
          statusKirim: "sent"
        },
        orderBy: { createdAt: "desc" },
        include: { matching: { include: { order: { include: { sppg: true } }, anggota: true } } }
      });

      if (!blastLog) {
        return { success: false, message: "Tidak ada penawaran pesanan aktif untuk Anda saat ini." };
      }

      const order = blastLog.matching.order;

      if (jawaban === "SETUJU") {
        try {
          const result = await prisma.$transaction(async (tx) => {
            const freshOrder = await tx.kebutuhanSppg.findUnique({
              where: { id: order.id },
              include: { sppg: true }
            });

            if (!freshOrder || (freshOrder.status !== "open" && freshOrder.status !== "matched")) {
              throw new Error("TELAT");
            }

            await tx.kebutuhanSppg.update({
              where: { id: order.id },
              data: { status: "locked" }
            });

            await tx.aiBlastLog.update({
              where: { id: blastLog.id },
              data: { respon: "SETUJU", respondedAt: new Date() }
            });

            // FIX: Cek apakah notifikasi PENYEDIA DITEMUKAN sudah pernah dikirim untuk order ini
            // (cegah duplikat blast ke SPPG jika ada multiple blastLog untuk 1 order)
            const alreadyNotified = await tx.aiBlastLog.findFirst({
              where: {
                matching: { idOrder: order.id },
                respon: "SETUJU"
              }
            });

            if (!alreadyNotified) {
              // FIX: Cari admin SPPG berdasarkan idSppg dari order, bukan hanya idKoperasi
              // Cari user yang terhubung ke SPPG ini
              const sppgAdmins = await tx.anggota.findMany({
                where: {
                  idKoperasi: freshOrder.sppg.idKoperasi,
                  kategoriUsaha: { in: ["Admin SPPG", "Petani"] },
                  status: "aktif",
                  noWhatsapp: { not: blastLog.matching.anggota.noWhatsapp } // jangan kirim ke petani itu sendiri
                },
                take: 1 // hanya 1 admin utama
              });

              // Lebih baik: cari langsung dari tb_user yang punya idSppg
              const sppgUserAdmin = await tx.anggota.findFirst({
                where: {
                  idKoperasi: freshOrder.sppg.idKoperasi,
                  kategoriUsaha: "Admin SPPG",
                  status: "aktif"
                }
              });

              const adminSppg = sppgUserAdmin || sppgAdmins[0] || null;

              // Kirim WhatsApp alert ke Admin SPPG jika terdaftar
              if (adminSppg && adminSppg.noWhatsapp) {
                try {
                  const sock = (await import("../../whatsapp.js")).getSocket();
                  if (sock) {
                    let formatTarget = adminSppg.noWhatsapp;
                    if (formatTarget.startsWith("0")) formatTarget = "62" + formatTarget.substring(1);
                    if (!formatTarget.startsWith("62")) formatTarget = "62" + formatTarget;
                    const targetJid = formatTarget + "@s.whatsapp.net";
                    
                    const farmerName = blastLog.matching.anggota.nama;
                    const farmerWa = blastLog.matching.anggota.noWhatsapp;
                    
                    const alertMsg = `🤝 *[PENYEDIA DITEMUKAN]* 🤝\n\n`
                      + `Halo ${adminSppg.nama}, koperasi sudah mencarikan penyedia untuk pesanan bapak/ibu:\n`
                      + `1. Barang: *${freshOrder.produk}*\n`
                      + `2. Jumlah: *${freshOrder.jumlah} ${freshOrder.satuan}*\n`
                      + `3. Penyedia: *${farmerName}* (${farmerWa})\n\n`
                      + `Barang saat ini sedang disiapkan oleh petani. Kami akan kabari jika barang mulai dikirim.`;
                      
                    await sock.sendMessage(targetJid, { text: alertMsg });
                    console.log(`[WA BOT] Notifikasi PENYEDIA DITEMUKAN terkirim ke ${formatTarget}`);
                  }
                } catch (waErr) {
                  console.warn("Gagal mengirim notifikasi WA ke SPPG:", waErr);
                }
              }
            } else {
              console.log(`[WA BOT] Notifikasi PENYEDIA DITEMUKAN untuk order #${order.id} sudah pernah dikirim, skip.`);
            }

            return { success: true, message: "Pesanan sudah bapak/ibu kunci. Silakan siapkan barangnya untuk dikirim ya Pak/Bu." };
          });
          return result;
        } catch (txErr: any) {
          if (txErr.message === "TELAT") {
            await prisma.aiBlastLog.update({
              where: { id: blastLog.id },
              data: { respon: "TELAT", respondedAt: new Date() }
            });
            return { success: false, message: "Maaf Pak/Bu, pesanan ini sudah diambil petani lain. Nanti kami kabari lagi ya." };
          }
          throw txErr;
        }
      } else if (jawaban === "TOLAK") {
        await prisma.aiBlastLog.update({
          where: { id: blastLog.id },
          data: { respon: "TOLAK", respondedAt: new Date() }
        });
        return { success: true, message: "Baik Pak/Bu, pesanan dibatalkan. Terima kasih." };
      }

      return { success: false, message: "Jawaban tidak valid." };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  }
};
