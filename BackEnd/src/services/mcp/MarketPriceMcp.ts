// Data harga acuan disinkronkan dengan komoditas real di tb_anggota_warga
// Sumber referensi: Panel Harga Bapanas (bapanas.go.id)
// Update terakhir: Juli 2026

const HARGA_BAPANAS: Record<string, { harga: number; satuan: string; tren: string }> = {
  // === KOMODITAS YANG ADA DI DATABASE KITA ===
  "beras":        { harga: 14800, satuan: "kg", tren: "Naik tipis" },
  "jagung":       { harga: 6200,  satuan: "kg", tren: "Stabil" },
  "cabai":        { harga: 42000, satuan: "kg", tren: "Turun" },
  "cabai merah":  { harga: 42000, satuan: "kg", tren: "Turun" },
  "cabai rawit":  { harga: 55000, satuan: "kg", tren: "Naik" },
  "bawang merah": { harga: 36000, satuan: "kg", tren: "Stabil" },
  "bawang putih": { harga: 42000, satuan: "kg", tren: "Stabil" },
  "kedelai":      { harga: 9500,  satuan: "kg", tren: "Stabil" },
  "tomat":        { harga: 12000, satuan: "kg", tren: "Turun" },
  "kentang":      { harga: 15000, satuan: "kg", tren: "Stabil" },

  // === KOMODITAS UMUM LAINNYA (untuk query Admin SPPG) ===
  "telur":        { harga: 28500, satuan: "kg", tren: "Naik" },
  "ayam":         { harga: 37000, satuan: "kg", tren: "Stabil" },
  "daging sapi":  { harga: 135000, satuan: "kg", tren: "Naik" },
  "ikan":         { harga: 32000, satuan: "kg", tren: "Stabil" },
  "minyak":       { harga: 17000, satuan: "liter", tren: "Stabil" },
  "gula":         { harga: 17500, satuan: "kg", tren: "Naik tipis" },
  "terigu":       { harga: 11000, satuan: "kg", tren: "Stabil" },
  "singkong":     { harga: 3500,  satuan: "kg", tren: "Stabil" },
  "ubi":          { harga: 5000,  satuan: "kg", tren: "Stabil" },
  "pisang":       { harga: 8000,  satuan: "kg", tren: "Stabil" },
};

export class MarketPriceMcp {
  static getPrice(komoditas: string) {
    const key = komoditas.toLowerCase().trim();
    
    // Exact match dulu
    let found = HARGA_BAPANAS[key];
    
    // Kalau tidak ketemu, coba partial match
    if (!found) {
      for (const [mapKey, val] of Object.entries(HARGA_BAPANAS)) {
        if (key.includes(mapKey) || mapKey.includes(key)) {
          found = val;
          break;
        }
      }
    }

    // Default fallback kalau tidak ada di daftar
    const harga = found?.harga ?? 12000;
    const satuan = found?.satuan ?? "kg";
    const tren = found?.tren ?? "Stabil";

    return {
      sumber: "Panel Harga Bapanas (Badan Pangan Nasional) - Simulated MCP",
      komoditas: komoditas,
      harga_rata_rata_nasional_per_kg: harga,
      satuan,
      tren_harga: tren,
      rekomendasi_ai: `Harga acuan ${komoditas} saat ini Rp${harga.toLocaleString("id-ID")}/${satuan} (tren: ${tren}). Gunakan sebagai harga dasar negosiasi yang adil antara petani dan Dapur SPPG.`
    };
  }

  // Expose daftar komoditas yang kita punya harga acuannya
  static getAvailableKomoditas(): string[] {
    return Object.keys(HARGA_BAPANAS);
  }
}
