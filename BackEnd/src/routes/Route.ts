import Elysia, { t } from "elysia";
import { authRoute } from "./authRoute";
import { KoperasiController, KoperasiValidation } from "../controllers/KoperasiController";
import { SppgController } from "../controllers/SppgController";
import { AnggotaController, anggotaSchema } from "../controllers/AnggotaController";
import { ProduksiController } from "../controllers/ProduksiController";
import { KebutuhanController } from "../controllers/KebutuhanController";
import { AiMatchingController } from "../controllers/AiMatchingController";
import { WaBlastController } from "../controllers/WaBlastController";
import { ApprovalController } from "../controllers/ApprovalController";
import { TransaksiController } from "../controllers/TransaksiController";
import { PinjamanController } from "../controllers/PinjamanController";
import { FinancialController } from "../controllers/FinancialController";
import { PpobController } from "../controllers/PpobController";
import { StatistikController } from "../controllers/StatistikController";
import { KasController } from "../controllers/KasController";
import { dashboardStatsController } from "../controllers/DashboardStatsController";
import { dashboardTxController } from "../controllers/DashboardTxController";
import { dashboardSimController } from "../controllers/DashboardSimController";
import { DashboardSimController } from "../controllers/DashboardSimController";
import { dashboardBlastController } from "../controllers/DashboardBlastController";
import { dashboardKebutuhanController } from "../controllers/DashboardKebutuhanController";
import { dashboardMatchingController } from "../controllers/DashboardMatchingController";

// ─── Auth ────────────────────────────────────────────────────────
// Menggunakan authRoute baru dengan @elysiajs/jwt dan validasi t.Object

// ─── Koperasi ────────────────────────────────────────────────────
const koperasiRoute = new Elysia({ prefix: "/koperasi" })
  .get("/", KoperasiController.getAll)
  .get("/:id", KoperasiController.getById)
  .post("/", KoperasiController.create)
  .put("/:id", KoperasiController.update)
  .delete("/:id", KoperasiController.delete)
  .post("/analisis-skenario", FinancialController.analisisSkenario)
  .post("/dampak-ekonomi", StatistikController.ukurDampakEkonomi);

// ─── SPPG ────────────────────────────────────────────────────────
const sppgRoute = new Elysia({ prefix: "/sppg" })
  .get("/", SppgController.getAll)
  .get("/:id", SppgController.getById)
  .post("/", SppgController.create)
  .put("/:id", SppgController.update)
  .delete("/:id", SppgController.delete);

// ─── Anggota ─────────────────────────────────────────────────────
const anggotaRoute = new Elysia({ prefix: "/anggota" })
  .get("/", AnggotaController.getAll)
  .get("/:id", AnggotaController.getById)
  .post("/", AnggotaController.create)
  .put("/:id", AnggotaController.update)
  .put("/:id/status", AnggotaController.updateStatus)
  .delete("/:id", AnggotaController.delete);

// ─── Produksi Harian ──────────────────────────────────────────────
const produksiRoute = new Elysia({ prefix: "/produksi" })
  .get("/", ProduksiController.getAll)
  .get("/:id", ProduksiController.getById)
  .post("/", ProduksiController.create)
  .put("/:id/status", ProduksiController.updateStatus);

// ─── Kebutuhan SPPG ───────────────────────────────────────────────
const kebutuhanRoute = new Elysia({ prefix: "/kebutuhan" })
  .get("/", KebutuhanController.getAll)
  .get("/:id", KebutuhanController.getById)
  .get("/sppg/:idSppg", KebutuhanController.getBySppg)
  .post("/", KebutuhanController.create)
  .put("/:id/status", KebutuhanController.updateStatus)
  .delete("/:id", KebutuhanController.delete);

// ─── AI Matching & Blast ──────────────────────────────────────────
const aiRoute = new Elysia({ prefix: "/ai" })
  .post("/match", AiMatchingController.match)
  .get("/match/:idOrder", AiMatchingController.getByOrder)
  .post("/blast", WaBlastController.blast)
  .get("/blast/log", WaBlastController.getLogs)
  .post("/blast/reply", WaBlastController.replyBlast);

// ─── Approval ────────────────────────────────────────────────────
const approvalRoute = new Elysia({ prefix: "/approval" })
  .get("/", ApprovalController.getAll)
  .post("/approve", ApprovalController.approve)
  .post("/reject", ApprovalController.reject);

// ─── Transaksi ───────────────────────────────────────────────────
const transaksiRoute = new Elysia({ prefix: "/transaksi" })
  .get("/saldo", TransaksiController.getSaldo)
  .post("/tarik", TransaksiController.tarikTunai)
  .post("/tarik/approve", TransaksiController.approveTarikTunai)
  .post("/selesai", TransaksiController.selesaiTransaksi)
  .post("/berangkat", TransaksiController.berangkatTransaksi);

// ─── Kas ─────────────────────────────────────────────────────────
const kasRoute = new Elysia({ prefix: "/kas" })
  .get("/", KasController.getAll);

// ─── Pinjaman ────────────────────────────────────────────────────
const pinjamanRoute = new Elysia({ prefix: "/pinjaman" })
  .get("/", PinjamanController.getAll)
  .post("/ajukan", PinjamanController.ajukanPinjaman)
  .put("/:id/approve", PinjamanController.approve);

// ─── PPOB ────────────────────────────────────────────────────────
const ppobRoute = new Elysia({ prefix: "/ppob" })
  .post("/bayar", PpobController.bayarTagihan);

// ─── Dashboard ───────────────────────────────────────────────────
const dashboardRoute = new Elysia({ prefix: "/dashboard" })
  .use(dashboardStatsController)
  .use(dashboardTxController)
  .use(dashboardBlastController)
  .use(dashboardKebutuhanController)
  .use(dashboardMatchingController)
  .post("/simulate", DashboardSimController.simulate);

// ─── Gabungkan semua route & Format Output Sesuai api.md ────────
export const Route = new Elysia()
  .mapResponse(({ response, set }) => {
    // Jika response sudah Response object atau string HTML (untuk QR code), bypass
    if (response instanceof Response) return response;
    if (typeof response === "string" && response.trim().startsWith("<!DOCTYPE")) return response;

    // Jika response berupa object JSON
    if (response && typeof response === "object") {
      const code = typeof set.status === "number" ? set.status : 200;
      
      let status = true;
      if ("success" in response) {
        status = !!(response as any).success;
      } else if ("status" in response) {
        status = !!(response as any).status;
      } else {
        status = code >= 200 && code < 300;
      }

      const message = (response as any).message || (status ? "Permintaan berhasil diproses" : "Terjadi kesalahan pada server");
      
      let data = (response as any).data;
      // Jika response tidak memiliki properti standar api.md, anggap seluruh response adalah data
      if (data === undefined && !("success" in response) && !("message" in response) && !("status" in response)) {
        data = response;
      }

      const formatted: any = {
        code,
        status,
        message
      };

      if (data !== undefined && data !== null) {
        formatted.data = data;
      }

      return new Response(JSON.stringify(formatted), {
        headers: {
          "Content-Type": "application/json"
        },
        status: code
      });
    }
  })
  .use(authRoute)
  .use(koperasiRoute)
  .use(sppgRoute)
  .use(anggotaRoute)
  .use(produksiRoute)
  .use(kebutuhanRoute)
  .use(aiRoute)
  .use(approvalRoute)
  .use(transaksiRoute)
  .use(pinjamanRoute)
  .use(kasRoute)
  .use(ppobRoute)
  .use(dashboardRoute);
