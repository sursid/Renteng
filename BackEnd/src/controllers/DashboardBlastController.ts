import { Elysia } from "elysia";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dashboardBlastController = new Elysia().get("/blast-logs", async () => {
  try {
    const blastLogs = await prisma.tb_ai_blast_log.findMany({
      include: {
        matching: {
          include: {
            anggota: true,
            order: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const formattedLogs = blastLogs.map((log: any) => {
      let statusBlast = "";
      if (log.respon === "SETUJU") {
        statusBlast = `Dibalas (${log.matching?.kuantitas || "X"} kg)`;
      } else if (log.respon === "TOLAK") {
        statusBlast = "Ditolak";
      } else if (log.respon === null && log.statusKirim === "sent") {
        statusBlast = "Dibaca / Dikirim";
      } else {
        statusBlast = log.statusKirim || "Pending";
      }

      return {
        waktuKirim: log.createdAt,
        namaPenerima: log.matching?.anggota?.nama || "-",
        nomorWhatsapp: log.matching?.anggota?.noWhatsapp || "-",
        isiTemplateChat: log.pesan,
        statusBlast
      };
    });

    return {
      success: true,
      data: formattedLogs
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Gagal mengambil log blast: " + error.message
    };
  }
});
