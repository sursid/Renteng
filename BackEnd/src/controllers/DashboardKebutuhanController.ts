import { Elysia } from 'elysia';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dashboardKebutuhanController = new Elysia().get('/kebutuhan-sppg', async () => {
  try {
    const kebutuhanList = await prisma.kebutuhanSppg.findMany({
      where: {
        status: 'open'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const now = new Date();

    const mappedData = kebutuhanList.map((item) => {
      const diffTime = now.getTime() - item.createdAt.getTime();
      const isMendesak = diffTime > 24 * 60 * 60 * 1000; // lebih dari 1 hari yang lalu

      const statusPenting = isMendesak ? 'Mendesak' : 'Aktif';
      const deadline = isMendesak ? 'Besok Pagi' : '2 Hari Lagi';

      return {
        id: item.id,
        produk: item.produk,
        volumeDibutuhkan: `${item.jumlah} ${item.satuan}`,
        paguKoperasi: item.hargaMaksimal,
        statusPenting,
        deadline
      };
    });

    return {
      success: true,
      data: mappedData
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Terjadi kesalahan saat mengambil data kebutuhan.'
    };
  }
});
