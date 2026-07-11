import { prisma } from "../../lib/db";
import { t } from "elysia";

export const anggotaSchema = {
  getAll: {
    query: t.Optional(t.Object({
      idKoperasi: t.Optional(t.String()),
      status: t.Optional(t.String())
    }))
  },
  getById: {
    params: t.Object({
      id: t.String()
    })
  },
  create: {
    body: t.Object({
      idKoperasi: t.Number(),
      nama: t.String({ minLength: 3 }),
      noWhatsapp: t.String({ minLength: 10 }),
      kategoriUsaha: t.Optional(t.String()),
      komoditas: t.Optional(t.String()),
      alamat: t.Optional(t.String()),
      lat: t.Optional(t.Number()),
      lng: t.Optional(t.Number()),
      gender: t.Optional(t.String()),
      sapaan: t.Optional(t.String()),
    })
  },
  update: {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      nama: t.Optional(t.String()),
      noWhatsapp: t.Optional(t.String()),
      kategoriUsaha: t.Optional(t.String()),
      komoditas: t.Optional(t.String()),
      alamat: t.Optional(t.String()),
      lat: t.Optional(t.Number()),
      lng: t.Optional(t.Number()),
      gender: t.Optional(t.String()),
      sapaan: t.Optional(t.String()),
    })
  },
  updateStatus: {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      status: t.Union([t.Literal("aktif"), t.Literal("suspend"), t.Literal("blokir")]),
      creditScore: t.Optional(t.Number())
    })
  },
  delete: {
    params: t.Object({ id: t.String() })
  }
};

export const AnggotaController = {
  async getAll({ query, set }: any) {
    try {
      const idKoperasi = query?.idKoperasi ? Number(query.idKoperasi) : undefined;
      const status = query?.status;

      const whereClause: any = {};
      if (idKoperasi) whereClause.idKoperasi = idKoperasi;
      if (status) whereClause.status = status;

      const data = await prisma.anggota.findMany({
        where: whereClause,
        include: { koperasi: true }
      });
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async getById({ params, set }: any) {
    try {
      const data = await prisma.anggota.findUnique({
        where: { id: Number(params.id) },
        include: { koperasi: true, produksiHarian: true }
      });
      if (!data) {
        set.status = 404;
        return { success: false, message: "Anggota tidak ditemukan" };
      }
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async create({ body, set }: any) {
    try {
      const existing = await prisma.anggota.findUnique({ where: { noWhatsapp: body.noWhatsapp }});
      if (existing) {
         set.status = 400;
         return { success: false, message: "No WhatsApp sudah terdaftar" };
      }

      const data = await prisma.anggota.create({ data: body });
      set.status = 201;
      return { success: true, message: "Anggota berhasil ditambahkan", data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async update({ params, body, set }: any) {
    try {
      const data = await prisma.anggota.update({
        where: { id: Number(params.id) },
        data: body
      });
      return { success: true, message: "Anggota berhasil diupdate", data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async updateStatus({ params, body, set }: any) {
    try {
      const { status, creditScore } = body;
      const data = await prisma.anggota.update({
        where: { id: Number(params.id) },
        data: {
          status,
          ...(creditScore !== undefined && { creditScore })
        }
      });
      return { success: true, message: `Status anggota berhasil diubah menjadi ${status}`, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async delete({ params, set }: any) {
    try {
      await prisma.anggota.delete({
        where: { id: Number(params.id) }
      });
      return { success: true, message: "Anggota berhasil dihapus" };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  }
};
