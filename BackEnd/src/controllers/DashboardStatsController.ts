import { Elysia, t } from "elysia";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dashboardStatsController = new Elysia()
  .get("/stats", async () => {
    // 1. Saldo Kas KUD
    const koperasiAgg = await prisma.koperasi.aggregate({
      _sum: {
        saldoKas: true,
      },
    });
    const saldoKasKud = Number(koperasiAgg._sum.saldoKas || 0);

    // 2. Total Anggota
    const totalAnggota = await prisma.anggota.count();

    // 3. Modal Disalurkan (Pinjaman)
    const pinjamanAgg = await prisma.pinjaman.aggregate({
      _sum: {
        jumlah: true,
      },
    });
    const modalDisalurkan = Number(pinjamanAgg._sum.jumlah || 0);

    // 4. Service Fee (Total Transaksi)
    const transaksiAgg = await prisma.transaksi.aggregate({
      _sum: {
        serviceFee: true,
      },
    });
    const serviceFee = Number(transaksiAgg._sum.serviceFee || 0);

    // 5. SHU Koperasi (Contoh: mock 80% dari service fee atau nilai statis)
    const shuKoperasi = serviceFee * 0.8;

    return {
      saldoKasKud: {
        value: saldoKasKud,
        percentage: 12.5, // Mock percentage
      },
      totalAnggota: {
        value: totalAnggota,
        percentage: 5.2,
      },
      modalDisalurkan: {
        value: modalDisalurkan,
        percentage: 8.1,
      },
      shuKoperasi: {
        value: shuKoperasi,
        percentage: 15.3,
      },
      serviceFee: {
        value: serviceFee,
        percentage: 10.4,
      },
    };
  }, {
    response: t.Object({
      saldoKasKud: t.Object({ value: t.Number(), percentage: t.Number() }),
      totalAnggota: t.Object({ value: t.Number(), percentage: t.Number() }),
      modalDisalurkan: t.Object({ value: t.Number(), percentage: t.Number() }),
      shuKoperasi: t.Object({ value: t.Number(), percentage: t.Number() }),
      serviceFee: t.Object({ value: t.Number(), percentage: t.Number() }),
    })
  })
  .get("/kotak-kuning", async () => {
    // 1. Fetch Active Demands (KebutuhanSppg) - mock limit 3
    const demands = await prisma.kebutuhanSppg.findMany({
      where: { status: "open" },
      take: 3,
      orderBy: { createdAt: "desc" }
    });

    const activeDemands = demands.map((d) => {
      // Mocking urgency and deadline based on arbitrary logic for now
      const isMendesak = d.jumlah >= 200 || d.produk.toLowerCase().includes("telur") || d.produk.toLowerCase().includes("cabai");
      return {
        id: d.id,
        urgency: isMendesak ? "Mendesak" : "Aktif",
        deadline: isMendesak ? "Besok Pagi" : "2 Hari Lagi",
        product: d.produk,
        volume: d.jumlah,
        pagu: Number(d.hargaMaksimal || 0),
        satuan: d.satuan
      };
    });

    // 2. Fetch AI Matching (Rekomendasi Matching Tani)
    const matchings = await prisma.aiMatching.findMany({
      include: {
        anggota: true,
        order: true
      },
      take: 5,
      orderBy: { score: "desc" }
    });

    const matchingSupplies = matchings.map((m) => {
      return {
        id: m.id,
        supplier: m.anggota.nama,
        phone: m.anggota.noWhatsapp,
        product: m.order?.produk || "Komoditas",
        qtyOffered: m.order?.jumlah || 0, // mock as full order quantity
        pagu: Number(m.order?.hargaMaksimal || 0),
        score: Math.round(m.score),
        nikStatus: m.anggota.status === "aktif" ? "Terverifikasi" : "Belum Verifikasi",
        status: "Menunggu" // mock status for dashboard approval
      };
    });

    return {
      activeDemands,
      matchingSupplies
    };
  })
  .get("/charts", async () => {
    // 30 hari terakhir
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transaksiList = await prisma.transaksi.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        kebutuhan: true,
      }
    });

    // Grouping by date (YYYY-MM-DD)
    const dailyData: Record<string, { tanggal: string; volume: number; perputaranUang: number }> = {};

    // Inisialisasi 30 hari kosong untuk memastikan tanggal yang tidak ada transaksi tetap ada di chart
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dailyData[dateStr] = {
        tanggal: dateStr,
        volume: 0,
        perputaranUang: 0,
      };
    }

    // Populate data
    for (const trx of transaksiList) {
      const dateStr = trx.createdAt.toISOString().split("T")[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].perputaranUang += Number(trx.nilaiTransaksi || 0);
        dailyData[dateStr].volume += trx.kebutuhan?.jumlah || 0;
      }
    }

    return Object.values(dailyData);
  }, {
    response: t.Array(
      t.Object({
        tanggal: t.String(),
        volume: t.Number(),
        perputaranUang: t.Number(),
      })
    )
  })
  .get("/permodalan", async ({ query }) => {
    let dateFilter = {};
    if (query.date) {
      const parsedDate = new Date(query.date as string);
      parsedDate.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { lte: parsedDate } };
    }

    const pinjamanRaw = await prisma.pinjaman.findMany({
      where: dateFilter,
      include: {
        anggota: {
          include: {
            kelompok: {
              include: {
                anggota: true
              }
            }
          }
        },
        votingRenteng: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = pinjamanRaw.map((p: any) => {
      const kelompok = p.anggota?.kelompok;
      const totalGroupMembers = kelompok?.anggota?.length || 1;
      
      const setujuCount = p.votingRenteng.filter((v: any) => v.status === 'setuju').length;
      const tolakCount = p.votingRenteng.filter((v: any) => v.status === 'tolak').length;
      const progress = Math.round((setujuCount / totalGroupMembers) * 100);

      return {
        id: `L${p.id.toString().padStart(3, '0')}`,
        name: p.anggota?.nama || 'Unknown',
        phone: p.anggota?.noWhatsapp || '-',
        amount: Number(p.jumlah),
        type: p.skema || 'yarnen',
        tenure: 6,
        status: p.status === 'pending' ? 'Menunggu' : (p.status === 'disetujui' ? 'Disetujui' : 'Ditolak'),
        date: p.createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        purpose: p.tujuan || 'Modal Usaha',
        quorum: {
          setuju: setujuCount,
          total: totalGroupMembers,
          progress: progress
        }
      };
    });

    return { data };
  })
  .get("/komoditas", async () => {
    const produks = await prisma.produk.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' }
    });

    const prices = produks.map((p: any) => ({
      id: p.id.toString(),
      item: p.namaProduk,
      price: Number(p.nilaiTransaksi) || 0,
      change: "+0.0%",
      trend: "stable",
      info: `Volume: ${p.volume}kg`
    }));

    return { prices };
  })
  .post("/komoditas", async ({ body, set }: any) => {
    try {
      const { id, price } = body;
      if (!id || price === undefined) {
        set.status = 400;
        return { error: "ID Komoditas dan harga wajib ditentukan" };
      }
      const updated = await prisma.produk.update({
        where: { id: Number(id) },
        data: { nilaiTransaksi: price }
      });
      return { success: true, updatedItem: updated };
    } catch (e: any) {
      set.status = 500;
      return { error: e.message };
    }
  });
