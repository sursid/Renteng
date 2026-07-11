import { prisma } from "../../lib/db";

import { MapsMcp } from "../services/mcp/MapsMcp";

export const AiMatchingController = {
  async match({ set }: any) {
    try {
      // 1. Ambil semua KebutuhanSppg yang open
      const kebutuhanList = await prisma.kebutuhanSppg.findMany({
        where: { status: "open" },
        include: { sppg: true } // Supaya dapat alamat SPPG
      });

      if (kebutuhanList.length === 0) {
        return { success: true, message: "Tidak ada kebutuhan SPPG yang open", data: [] };
      }

      const matchResults = [];

      // 2. Loop setiap kebutuhan
      const matchingPromises = kebutuhanList.map(async (keb) => {
        // Cari anggota dengan komoditas mirip dan status aktif
        const anggotaPotensial = await prisma.anggota.findMany({
          where: { 
            status: "aktif",
            komoditas: { contains: keb.produk }
          }
        });

        const alamatSppg = keb.sppg?.alamat || "Dapur SPPG Pusat";

        // 3. [PARALEL MCP] Hitung score & jarak pakai MCP secara konkuren (Paralel Plan)
        const anggotaPromises = anggotaPotensial.map(async (anggota) => {
            let score = 0;
            
            // Komoditas exact match
            if (anggota.komoditas?.toLowerCase() === keb.produk.toLowerCase()) score += 0.4;
            else score += 0.2; 
            
            if (anggota.optInConsent) score += 0.2;

            // --- MCP THINKING: SIMULASI PENCARIAN JARAK TERDEKAT (DIJALANKAN PARALEL) ---
            const alamatPetani = anggota.alamat || ("Gudang Petani " + anggota.nama);
            const jarakInfo = await MapsMcp.getDistance(alamatSppg, alamatPetani);
            
            // Jika jarak terlalu jauh (> 10km), jangan dibrast!
            if (jarakInfo.estimasi_jarak_km > 10) {
                console.log(`[AI MATCHING] Petani ${anggota.nama} dibatalkan karena jarak ${jarakInfo.estimasi_jarak_km}km (>10km)`);
                return null;
            }

            // Jarak < 10 km, maka tambahkan score besar
            if (jarakInfo.estimasi_jarak_km < 10) score += 0.4;
            else score += 0.1;

            // 4. Simpan ke AiMatching
            const matchRecord = await prisma.aiMatching.create({
              data: {
                idOrder: keb.id,
                idAnggota: anggota.id,
                score,
                rekomendasiAi: `Sangat cocok (Jarak: ${jarakInfo.estimasi_jarak_km} km) - Score: ${score.toFixed(2)}`,
                confidence: score
              }
            });

            // 5. Antrikan ke tabel Blast WA
            await prisma.aiBlastLog.create({
                data: {
                    idMatching: matchRecord.id,
                    pesan: `Ada order ${keb.produk} dari SPPG terdekat! Jarak dari tempat Anda ${jarakInfo.estimasi_jarak_km} km.`,
                    statusKirim: "pending"
                }
            });

            return matchRecord;
        });

        // Tunggu semua proses paralel selesai
        let results = await Promise.all(anggotaPromises);
        results = results.filter(r => r !== null); // Hapus null (petani yg kejauhan)
        matchResults.push(...results);

        // 6. Update status kebutuhan jadi matched jika ada hasil
        if (results.length > 0) {
          await prisma.kebutuhanSppg.update({
            where: { id: keb.id },
            data: { status: "matched" }
          });
        }
      });

      // Tunggu semua kebutuhan selesai diproses secara paralel
      await Promise.all(matchingPromises);

      return { success: true, message: "Matching & Blast Selesai", data: matchResults };
    } catch (e: any) {
      if (set) set.status = 500;
      return { success: false, message: e.message };
    }
  },

  async getByOrder({ params, set }: any) {
    try {
      const data = await prisma.aiMatching.findMany({
        where: { idOrder: Number(params.idOrder) },
        include: { anggota: true, order: true }
      });
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  }
};
