import { prisma } from "../../lib/db";

export const ProduksiController = {
  async getAll({ query, set }: any) {
    try {
      const idAnggota = query.idAnggota ? Number(query.idAnggota) : undefined;
      const data = await prisma.produksiHarian.findMany({
        where: idAnggota ? { idAnggota } : undefined,
        include: { anggota: true }
      });
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async getById({ params, set }: any) {
    try {
      const data = await prisma.produksiHarian.findUnique({
        where: { id: Number(params.id) },
        include: { anggota: true }
      });
      if (!data) {
        set.status = 404;
        return { success: false, message: "Data produksi tidak ditemukan" };
      }
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async create({ body, set }: any) {
    try {
      // Pastikan tanggal diparse ke Date ISO jika string
      const payload = {
        ...body,
        tanggal: body.tanggal ? new Date(body.tanggal) : new Date()
      };
      
      const data = await prisma.produksiHarian.create({ data: payload });
      set.status = 201;
      return { success: true, message: "Data produksi berhasil ditambahkan", data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async updateStatus({ params, body, set }: any) {
    try {
      const data = await prisma.produksiHarian.update({
        where: { id: Number(params.id) },
        data: { status: body.status }
      });
      return { success: true, message: "Status produksi berhasil diupdate", data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  }
};
