import { Elysia } from "elysia";
import { prisma } from "../../lib/db";

export const dashboardMatchingController = new Elysia()
  .get("/rekomendasi-matching", async ({ set }) => {
    try {
      // Ambil data dari tb_ai_matching yang belum di-approve (asumsi: tidak ada log approval dengan status 'approved')
      const matchings = await prisma.aiMatching.findMany({
        where: {
          kebutuhan: {
            none: {
              approval: {
                some: {
                  status: "approved"
                }
              }
            }
          }
        },
        include: {
          anggota: true,
          order: true
        }
      });

      const result = matchings.map((m) => {
        const orderJumlah = m.order?.jumlah || 0;
        // Mock logic: 80% dari order.jumlah
        const kesanggupanSuplai = Math.floor(orderJumlah * 0.8) || 1;
        const hargaMaksimal = Number(m.order?.hargaMaksimal || 0);
        const serviceFee = kesanggupanSuplai * hargaMaksimal * 0.03;
        
        return {
          id: m.id,
          namaTani: m.anggota?.nama || "-",
          noWa: m.anggota?.noWhatsapp || "-",
          komoditasTani: m.order?.produk || "-",
          kesanggupanSuplai,
          kecocokan: Math.round(m.score * 100), // score * 100 (%)
          verifikasiNik: "Terverifikasi", // mock
          serviceFee,
          status: "Menunggu"
        };
      });

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: error.message
      };
    }
  })
  .post("/approve", async ({ body, set }: any) => {
    try {
      const { id } = body;
      // In a real scenario, this would create a BlastLog or Approval log.
      // For the demo, we update the AiMatching's related order to 'approved'
      // Or we just return success so the frontend knows it succeeded.
      
      const matching = await prisma.aiMatching.findUnique({ where: { id: Number(id) } });
      if (matching) {
        await prisma.kebutuhanSppg.update({
          where: { id: matching.idOrder },
          data: { status: "approved" }
        });
      }

      return { success: true, message: "Suplai disetujui" };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  })
  .post("/reject", async ({ body, set }: any) => {
    try {
      const { id } = body;
      const matching = await prisma.aiMatching.findUnique({ where: { id: Number(id) } });
      if (matching) {
        // Reset order status to open
        await prisma.kebutuhanSppg.update({
          where: { id: matching.idOrder },
          data: { status: "open" }
        });
        // Optionally delete the matching
        await prisma.aiMatching.delete({ where: { id: Number(id) } });
      }

      return { success: true, message: "Rekomendasi suplai ditolak" };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  });
