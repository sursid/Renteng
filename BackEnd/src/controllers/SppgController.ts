import { t } from "elysia";
import { prisma } from "../../lib/db";
import { Prisma } from "@prisma/client";

export const SppgController = {
  createSchema: {
    body: t.Object({
      idKoperasi: t.Numeric(),
      namaSppg: t.String({ minLength: 1 }),
      alamat: t.Optional(t.String()),
      lat: t.Optional(t.Numeric()),
      lng: t.Optional(t.Numeric()),
      kapasitasHarian: t.Optional(t.Numeric()),
      status: t.Optional(t.String())
    })
  },

  updateSchema: {
    body: t.Object({
      idKoperasi: t.Optional(t.Numeric()),
      namaSppg: t.Optional(t.String({ minLength: 1 })),
      alamat: t.Optional(t.String()),
      lat: t.Optional(t.Numeric()),
      lng: t.Optional(t.Numeric()),
      kapasitasHarian: t.Optional(t.Numeric()),
      status: t.Optional(t.String())
    })
  },

  async getAll({ set }: any) {
    try {
      const data = await prisma.sppg.findMany({
        include: { koperasi: true }
      });
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: "Terjadi kesalahan pada server", error: e.message };
    }
  },

  async getById({ params, set }: any) {
    try {
      const data = await prisma.sppg.findUnique({
        where: { id: Number(params.id) },
        include: { koperasi: true, kebutuhanList: true }
      });
      if (!data) {
        set.status = 404;
        return { success: false, message: "SPPG tidak ditemukan" };
      }
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: "Terjadi kesalahan pada server", error: e.message };
    }
  },

  async create({ body, set }: any) {
    try {
      const data = await prisma.sppg.create({ data: body });
      set.status = 201;
      return { success: true, message: "SPPG berhasil ditambahkan", data };
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          set.status = 400;
          return { success: false, message: "Koperasi tidak ditemukan" };
        }
      }
      set.status = 500;
      return { success: false, message: "Terjadi kesalahan saat membuat SPPG", error: e.message };
    }
  },

  async update({ params, body, set }: any) {
    try {
      const data = await prisma.sppg.update({
        where: { id: Number(params.id) },
        data: body
      });
      return { success: true, message: "SPPG berhasil diupdate", data };
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          set.status = 404;
          return { success: false, message: "SPPG tidak ditemukan" };
        }
        if (e.code === 'P2003') {
          set.status = 400;
          return { success: false, message: "Koperasi tidak ditemukan" };
        }
      }
      set.status = 500;
      return { success: false, message: "Terjadi kesalahan saat mengupdate SPPG", error: e.message };
    }
  },

  async delete({ params, set }: any) {
    try {
      await prisma.sppg.delete({
        where: { id: Number(params.id) }
      });
      return { success: true, message: "SPPG berhasil dihapus" };
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          set.status = 404;
          return { success: false, message: "SPPG tidak ditemukan" };
        }
      }
      set.status = 500;
      return { success: false, message: "Terjadi kesalahan saat menghapus SPPG", error: e.message };
    }
  }
};
