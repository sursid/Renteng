import { prisma } from '../../lib/db';
import { askGemini } from './geminiService';
export const DocumentAI = {
  async generateDraftRat(idKoperasi: number) {
    try {
      const koperasi = await prisma.koperasi.findUnique({ where: { id: idKoperasi }, select: { namaKoperasi: true, saldoKas: true } });
      if (!koperasi) return { success: false, message: 'Koperasi tidak ditemukan' };
      const jumlahTransaksi = await prisma.transaksi.count({ where: { anggota: { idKoperasi } } });
      const prompt = `Buatkan draft Laporan Rapat Anggota Tahunan (RAT) untuk koperasi '${koperasi.namaKoperasi}'. Data: Saldo Kas Rp ${koperasi.saldoKas}, Total Transaksi: ${jumlahTransaksi}. Buat dalam format Markdown profesional dengan bagian: Pembukaan, Laporan Keuangan, Pencapaian, dan Penutup.`;
      const draftText = await askGemini(prompt);
      return { success: true, data: draftText };
    } catch (e: any) { return { success: false, message: e.message }; }
  }
};
export const generateDraftRat = DocumentAI.generateDraftRat;
