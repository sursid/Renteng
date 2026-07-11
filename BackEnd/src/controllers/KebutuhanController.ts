import { prisma } from "../../lib/db";

export const KebutuhanController = {
  async getAll({ query, set }: any) {
    try {
      const status = query.status;
      const data = await prisma.kebutuhanSppg.findMany({
        where: status ? { status } : undefined,
        include: { sppg: true }
      });
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async getById({ params, set }: any) {
    try {
      const data = await prisma.kebutuhanSppg.findUnique({
        where: { id: Number(params.id) },
        include: { sppg: true }
      });
      if (!data) {
        set.status = 404;
        return { success: false, message: "Kebutuhan tidak ditemukan" };
      }
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async getBySppg({ params, set }: any) {
    try {
      const data = await prisma.kebutuhanSppg.findMany({
        where: { idSppg: Number(params.idSppg) },
        include: { sppg: true }
      });
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async create({ body, set }: any) {
    try {
      let idSppg = body.idSppg;
      
      if (body.noWaSppg) {
        let searchNomor = String(body.noWaSppg);
        if (searchNomor.startsWith("62")) searchNomor = searchNomor.substring(2);
        if (searchNomor.startsWith("0")) searchNomor = searchNomor.substring(1);

        const admin = await prisma.anggota.findFirst({
          where: { noWhatsapp: { endsWith: searchNomor } }
        });

        if (admin) {
          const sppg = await prisma.sppg.findFirst({
            where: { idKoperasi: admin.idKoperasi }
          });
          if (sppg) {
            idSppg = sppg.id;
          }
        }
      }

      if (!idSppg) {
        set.status = 400;
        return { success: false, message: "ID SPPG tidak dapat diidentifikasi untuk nomor WhatsApp pengirim." };
      }

      const data = await prisma.kebutuhanSppg.create({
        data: {
          idSppg: Number(idSppg),
          produk: body.produk,
          jumlah: Number(body.jumlah),
          satuan: body.satuan || "kg",
          hargaMaksimal: Number(body.hargaMaksimal || 20000),
          status: body.status || "open"
        }
      });

      set.status = 201;
      return { success: true, message: "Kebutuhan SPPG berhasil ditambahkan", data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async updateStatus({ params, body, set }: any) {
    try {
      const data = await prisma.kebutuhanSppg.update({
        where: { id: Number(params.id) },
        data: { status: body.status }
      });
      return { success: true, message: "Status kebutuhan berhasil diupdate", data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async delete({ params, set }: any) {
    try {
      await prisma.kebutuhanSppg.delete({
        where: { id: Number(params.id) }
      });
      return { success: true, message: "Kebutuhan berhasil dihapus" };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  }
};
