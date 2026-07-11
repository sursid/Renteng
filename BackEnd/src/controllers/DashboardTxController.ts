import { Elysia } from 'elysia';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dashboardTxController = new Elysia()
  .get('/transactions', async () => {
    try {
      // Ambil data agregat dari tb_pinjaman di-join dengan tb_anggota
      const pinjamanList = await prisma.pinjaman.findMany({
        include: {
          anggota: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Format JSON sesuai front-end
      const formattedData = pinjamanList.map((p) => ({
        id: p.id,
        namaPemohon: p.anggota.nama,
        noWa: p.anggota.noWhatsapp,
        skema: p.skema || p.anggota.kategoriUsaha || 'Yarnen',
        besarPermodalan: p.jumlah,
        tujuan: p.tujuan || 'Modal Usaha',
        status: p.status,
        aksi: 'view' // Atau logika aksi lainnya sesuai status
      }));

      return {
        success: true,
        data: formattedData
      };
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      return {
        success: false,
        message: 'Gagal mengambil data transaksi'
      };
    }
  });
