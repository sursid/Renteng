import { prisma } from '../../lib/db';
export const FinancialController = {
  async analisisSkenario({ body, set }: any) {
    try {
      const { idKoperasi } = body;
      const koperasi = await prisma.koperasi.findUnique({ where: { id: Number(idKoperasi) } });
      if (!koperasi) { set.status = 404; return { success: false, message: 'Koperasi tidak ditemukan' }; }
      const saldo = Number(koperasi.saldoKas);
      const peringatan = saldo < 1000000 ? '⚠️ LIKUIDITAS RENDAH! Saldo kas koperasi di bawah Rp 1.000.000. Segera tingkatkan volume transaksi.' : null;
      return { success: true, data: { saldoKasSaatIni: saldo, peringatanLikuiditas: peringatan, proyeksi: { optimis: { label: 'Optimis (+20%)', estimasi: saldo * 1.20, catatan: 'Jika volume transaksi SPPG naik 20%' }, moderat: { label: 'Moderat (+5%)', estimasi: saldo * 1.05, catatan: 'Pertumbuhan normal bulanan' }, pesimis: { label: 'Pesimis (-15%)', estimasi: saldo * 0.85, catatan: 'Risiko gagal panen atau gangguan pasokan' } } } };
    } catch (e: any) { set.status = 500; return { success: false, message: e.message }; }
  }
};
