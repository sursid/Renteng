import { prisma } from '../../lib/db';
export const PinjamanController = {
  async ajukanPinjaman({ body, set }: any) {
    try {
      const { idAnggota, jumlah } = body;
      const anggota = await prisma.anggota.findUnique({ where: { id: Number(idAnggota) } });
      if (!anggota) { set.status = 404; return { success: false, message: 'Anggota tidak ditemukan' }; }
      if (Number(jumlah) <= 0) {
        return { success: false, message: 'Jumlah pinjaman harus lebih besar dari 0' };
      }
      if (anggota.creditScore < 50) { 
        return { success: false, message: `Credit score Anda ${anggota.creditScore}/100. Minimal 50 untuk mengajukan pinjaman.` }; 
      }
      
      const [pinjaman] = await prisma.$transaction([
        prisma.pinjaman.create({ data: { idAnggota: anggota.id, jumlah: Number(jumlah), status: 'disetujui' } }),
        prisma.anggota.update({ where: { id: anggota.id }, data: { saldo: { increment: Number(jumlah) } } })
      ]);
      
      return { success: true, message: `Pinjaman Rp ${jumlah} disetujui! Dana telah ditambahkan ke saldo Anda.`, data: pinjaman };
    } catch (e: any) { 
      set.status = 500; 
      return { success: false, message: e.message }; 
    }
  },

  async getAll({ set }: any) {
    try {
      const pinjaman = await prisma.pinjaman.findMany({
        include: {
          anggota: {
            include: { kelompok: { include: { _count: { select: { anggota: true } } } } }
          },
          votingRenteng: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const dataWithQuorum = pinjaman.map((p: any) => {
        const totalAnggotaKelompok = p.anggota?.kelompok?._count?.anggota || 0;
        const totalPemilih = Math.max(0, totalAnggotaKelompok - 1); // Exclude the borrower
        const setujuCount = p.votingRenteng.filter((v: any) => v.status === 'setuju').length;
        return { ...p, quorum: { setuju: setujuCount, total: totalPemilih } };
      });

      return { success: true, data: dataWithQuorum };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async approve({ params, set }: any) {
    try {
      const pinjaman = await prisma.pinjaman.update({
        where: { id: Number(params.id) },
        data: { status: 'disetujui' }
      });
      return { success: true, message: 'Pinjaman berhasil disetujui.', data: pinjaman };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  }
};
