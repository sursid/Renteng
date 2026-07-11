import { prisma } from '../../lib/db';

export const KasController = {
  async getAll({ set }: any) {
    try {
      const data = await prisma.bukuKas.findMany({
        orderBy: { tanggal: 'desc' }
      });
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  }
};
