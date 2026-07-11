import { t } from "elysia";
import { prisma } from "../../lib/db";

export const KoperasiValidation = {
  params: t.Object({
    id: t.Numeric()
  }),
  create: t.Object({
    idDesa: t.String(),
    namaKoperasi: t.String(),
    tingkatModernisasi: t.Optional(t.String()),
    saldoKas: t.Optional(t.Numeric()),
    status: t.Optional(t.String()),
    nomorBadanHukum: t.Optional(t.String()),
    jenisKoperasi: t.Optional(t.String()),
    statusRat: t.Optional(t.String()),
    tahunBukuRat: t.Optional(t.Numeric()),
    skorKesehatan: t.Optional(t.Numeric()),
    predikatKesehatan: t.Optional(t.String()),
    npwp: t.Optional(t.String()),
    nib: t.Optional(t.String()),
    provinsi: t.Optional(t.String()),
    kabupatenKota: t.Optional(t.String()),
    statusLahan: t.Optional(t.String()),
    progressPembangunan: t.Optional(t.Numeric()),
    erl: t.Optional(t.Numeric()),
    lat: t.Optional(t.Numeric()),
    lng: t.Optional(t.Numeric()),
    idProvinsi: t.Optional(t.Numeric()),
    idKabupaten: t.Optional(t.Numeric())
  }),
  update: t.Object({
    idDesa: t.Optional(t.String()),
    namaKoperasi: t.Optional(t.String()),
    tingkatModernisasi: t.Optional(t.String()),
    saldoKas: t.Optional(t.Numeric()),
    status: t.Optional(t.String()),
    nomorBadanHukum: t.Optional(t.String()),
    jenisKoperasi: t.Optional(t.String()),
    statusRat: t.Optional(t.String()),
    tahunBukuRat: t.Optional(t.Numeric()),
    skorKesehatan: t.Optional(t.Numeric()),
    predikatKesehatan: t.Optional(t.String()),
    npwp: t.Optional(t.String()),
    nib: t.Optional(t.String()),
    provinsi: t.Optional(t.String()),
    kabupatenKota: t.Optional(t.String()),
    statusLahan: t.Optional(t.String()),
    progressPembangunan: t.Optional(t.Numeric()),
    erl: t.Optional(t.Numeric()),
    lat: t.Optional(t.Numeric()),
    lng: t.Optional(t.Numeric()),
    idProvinsi: t.Optional(t.Numeric()),
    idKabupaten: t.Optional(t.Numeric())
  })
};

export const KoperasiController = {
  async getAll({ set }: any) {
    try {
      const data = await prisma.koperasi.findMany();
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async getById({ params, set }: any) {
    try {
      const data = await prisma.koperasi.findUnique({
        where: { id: Number(params.id) },
        include: { anggota: true, sppgList: true }
      });
      if (!data) {
        set.status = 404;
        return { success: false, message: "Koperasi tidak ditemukan" };
      }
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async create({ body, set }: any) {
    try {
      const data = await prisma.koperasi.create({ data: body });
      set.status = 201;
      return { success: true, message: "Koperasi berhasil ditambahkan", data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async update({ params, body, set }: any) {
    try {
      const existing = await prisma.koperasi.findUnique({
        where: { id: Number(params.id) }
      });

      if (!existing) {
        set.status = 404;
        return { success: false, message: "Koperasi tidak ditemukan" };
      }

      const data = await prisma.koperasi.update({
        where: { id: Number(params.id) },
        data: body
      });
      return { success: true, message: "Koperasi berhasil diupdate", data };
    } catch (e: any) {
      if (e.code === 'P2025') {
        set.status = 404;
        return { success: false, message: "Koperasi tidak ditemukan" };
      }
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async delete({ params, set }: any) {
    try {
      const existing = await prisma.koperasi.findUnique({
        where: { id: Number(params.id) }
      });

      if (!existing) {
        set.status = 404;
        return { success: false, message: "Koperasi tidak ditemukan" };
      }

      await prisma.koperasi.delete({
        where: { id: Number(params.id) }
      });
      return { success: true, message: "Koperasi berhasil dihapus" };
    } catch (e: any) {
      if (e.code === 'P2025') {
        set.status = 404;
        return { success: false, message: "Koperasi tidak ditemukan" };
      }
      set.status = 500;
      return { success: false, message: e.message };
    }
  }
};
