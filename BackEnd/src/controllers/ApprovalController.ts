import { t } from "elysia";
import { prisma } from "../../lib/db";
import { getSocket } from "../../whatsapp.js";

export const ApprovalController = {
  approveSchema: t.Object({
    idBlast: t.Numeric(),
    approvedBy: t.String(),
    catatan: t.Optional(t.String()),
  }),
  
  rejectSchema: t.Object({
    idBlast: t.Numeric(),
    approvedBy: t.String(),
    catatan: t.Optional(t.String()),
  }),

  async approve({ body, set }: any) {
    try {
      const { idBlast, approvedBy, catatan } = body;
      
      const data = await prisma.approvalPengurus.create({
        data: {
          idBlast: Number(idBlast),
          approvedBy,
          catatan,
          status: "approved"
        }
      });

      // 1. Ambil blastLog terkait untuk mendapatkan id KebutuhanSppg dan nomor WA
      const blastLog = await prisma.aiBlastLog.findUnique({
        where: { id: Number(idBlast) },
        include: { matching: { include: { order: true, anggota: true } } }
      });

      if (blastLog && blastLog.matching) {
        // 2. Ubah status KebutuhanSppg menjadi approved
        await prisma.kebutuhanSppg.update({
          where: { id: blastLog.matching.idOrder },
          data: { status: "approved" }
        });

        // 3. Memicu blast WA ke petani
        const sock = getSocket();
        if (sock) {
          try {
            const noWa = blastLog.matching.anggota.noWhatsapp;
            let formatTarget = noWa.startsWith("0") ? "62" + noWa.substring(1) : noWa;
            const jid = `${formatTarget}@s.whatsapp.net`;
            
            const pesan = `Halo ${blastLog.matching.anggota.nama}! 👋\n\nAda pesanan dari SPPG yang telah disetujui Pengurus:\n📦 Produk: ${blastLog.matching.order.produk}\n🔢 Jumlah: ${blastLog.matching.order.jumlah} ${blastLog.matching.order.satuan}\n💰 Harga max: Rp${blastLog.matching.order.hargaMaksimal}\n\nBalas *YA* atau *TIDAK*, atau balas langsung dengan pesan biasa (contoh: "Siap, bisa saya kirim").\n\n_RentengPay Bot_`;
            
            await sock.sendMessage(jid, { text: pesan });

            // Update status blast menjadi sent
            await prisma.aiBlastLog.update({
              where: { id: blastLog.id },
              data: { statusKirim: "sent", pesan }
            });
          } catch (waErr: any) {
            console.error("Gagal mengirim WA:", waErr.message);
            await prisma.aiBlastLog.update({
              where: { id: blastLog.id },
              data: { statusKirim: "failed", respon: waErr.message }
            });
          }
        }
      }

      return { success: true, message: "Blast di-approve, pesanan SPPG disetujui dan WA terkirim", data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async reject({ body, set }: any) {
    try {
      const { idBlast, approvedBy, catatan } = body;
      
      const data = await prisma.approvalPengurus.create({
        data: {
          idBlast: Number(idBlast),
          approvedBy,
          catatan,
          status: "rejected"
        }
      });

      // 1. Ambil blastLog untuk me-reset pencocokan
      const blastLog = await prisma.aiBlastLog.findUnique({
        where: { id: Number(idBlast) },
        include: { matching: true }
      });

      if (blastLog && blastLog.matching) {
        // 2. Ubah status KebutuhanSppg menjadi open agar AI bisa mencari petani lain
        await prisma.kebutuhanSppg.update({
          where: { id: blastLog.matching.idOrder },
          data: { status: "open" }
        });

        // Hapus matching ini agar tidak terpilih lagi atau dibiarkan saja (bisa disesuaikan, untuk amannya hapus saja log blast nya atau mark as rejected)
        await prisma.aiBlastLog.update({
            where: { id: blastLog.id },
            data: { statusKirim: "rejected" }
        });
      }

      return { success: true, message: "Blast di-reject, pencocokan di-reset", data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async getAll({ set }: any) {
    try {
      const data = await prisma.approvalPengurus.findMany({
        include: { blast: { include: { matching: true } } }
      });
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  }
};
