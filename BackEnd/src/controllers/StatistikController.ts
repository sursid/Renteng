import { prisma } from '../../lib/db';
export const StatistikController = {
  async ukurDampakEkonomi({ body, set }: any) {
    try {
      const { idKoperasi } = body;
      const transaksi = await prisma.transaksi.findMany({ where: { anggota: { idKoperasi: Number(idKoperasi) } } });
      const totalNilaiTransaksi = transaksi.reduce((sum, t) => sum + Number(t.nilaiTransaksi), 0);
      const multiplierEffect = 1.5;
      const dampakEkonomi = totalNilaiTransaksi * multiplierEffect;
      const enpv = dampakEkonomi * 0.85;
      return { success: true, data: { idKoperasi, jumlahTransaksi: transaksi.length, totalNilaiTransaksi, multiplierEffect, estimasiPerputaranUangDiDesa: dampakEkonomi, enpv, catatan: `Setiap Rp 1 yang berputar melalui koperasi ini menghasilkan Rp ${multiplierEffect} dampak ekonomi di desa.` } };
    } catch (e: any) { set.status = 500; return { success: false, message: e.message }; }
  }
};
