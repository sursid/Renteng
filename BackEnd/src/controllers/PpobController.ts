import { prisma } from '../../lib/db';

export const PpobController = {
  async bayarTagihan({ body }: any) {
    try {
      const { idAnggota, jenisTagihan, nominal } = body;

      if (!idAnggota || !jenisTagihan || !nominal) {
        return {
          success: false,
          message: 'idAnggota, jenisTagihan, dan nominal harus diisi'
        };
      }

      const numNominal = Number(nominal);
      
      if (isNaN(numNominal) || numNominal <= 0) {
        return {
          success: false,
          message: 'Nominal pembayaran tidak valid dan harus lebih besar dari 0'
        };
      }

      const anggota = await prisma.anggota.findUnique({
        where: { id: Number(idAnggota) }
      });

      if (!anggota) {
        return {
          success: false,
          message: 'Anggota tidak ditemukan'
        };
      }

      if (Number(anggota.saldo) < numNominal) {
        return {
          success: false,
          message: 'Saldo tidak cukup'
        };
      }

      const serviceFee = numNominal * 0.05;

      await prisma.$transaction([
        prisma.anggota.update({
          where: { id: Number(idAnggota) },
          data: {
            saldo: {
              decrement: numNominal
            }
          }
        }),
        prisma.koperasi.update({
          where: { id: anggota.idKoperasi },
          data: {
            saldoKas: {
              increment: serviceFee
            }
          }
        })
      ]);

      return {
        success: true,
        message: 'Pembayaran tagihan berhasil',
        data: {
          idAnggota,
          jenisTagihan,
          nominal: numNominal,
          serviceFee
        }
      };
    } catch (error: any) {
      console.error(error);
      return {
        success: false,
        message: 'Terjadi kesalahan pada server',
        error: error.message
      };
    }
  }
};
