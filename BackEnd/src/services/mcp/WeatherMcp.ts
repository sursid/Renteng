// Simulasi data cuaca berbasis lokasi (deterministik, bukan random murni)
// Sumber referensi: BMKG Open API (api.bmkg.go.id)

interface WeatherResult {
  sumber: string;
  lokasi: string;
  status_cuaca: string;
  suhu_celsius: number;
  kelembaban_persen: number;
  kecepatan_angin_kmh: number;
  rekomendasi_ai: string;
  dampak_pertanian: string;
}

// Hash sederhana dari string lokasi untuk determinisme
function hashLokasi(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const KONDISI_CUACA = [
  {
    status: "Cerah ☀️",
    suhu: 32,
    kelembaban: 65,
    angin: 12,
    dampak: "Sangat cocok untuk panen dan penjemuran hasil pertanian.",
    rekomendasi: "Cuaca cerah, ini waktu ideal untuk panen dan pengiriman ke SPPG. Pastikan hasil panen dikemas rapat."
  },
  {
    status: "Cerah Berawan ⛅",
    suhu: 29,
    kelembaban: 72,
    angin: 15,
    dampak: "Aman untuk panen. Suhu bersahabat, baik untuk kualitas sayuran.",
    rekomendasi: "Cuaca bersahabat. Cocok untuk aktivitas di lahan dan pengangkutan hasil panen ke koperasi."
  },
  {
    status: "Berawan 🌥️",
    suhu: 27,
    kelembaban: 80,
    angin: 10,
    dampak: "Waspadai kemungkinan hujan ringan. Tunda penjemuran sementara.",
    rekomendasi: "Ada potensi hujan. Segerakan proses panen dan simpan di tempat kering sebelum dikirim."
  },
  {
    status: "Hujan Ringan 🌦️",
    suhu: 24,
    kelembaban: 90,
    angin: 20,
    dampak: "Tunda penjemuran. Jalan licin, hati-hati pengiriman barang.",
    rekomendasi: "Hujan ringan sedang berlangsung. Tunda pengiriman ke SPPG jika jalan becek. Simpan hasil panen di lumbung sementara."
  },
  {
    status: "Hujan Lebat ⛈️",
    suhu: 22,
    kelembaban: 96,
    angin: 35,
    dampak: "WASPADA: Risiko kerusakan panen tinggi. Jangan keluar lahan.",
    rekomendasi: "WASPADA cuaca ekstrem. Batalkan/tunda semua pengiriman ke SPPG. Pastikan panen sudah dipanen dan aman di gudang."
  }
];

export class WeatherMcp {
  static async getWeather(lokasi: string): Promise<WeatherResult> {
    const apiKey = process.env.BMKG_API_KEY || process.env.OPENWEATHER_API_KEY;

    // Coba OpenWeatherMap API kalau ada key
    if (apiKey && process.env.OPENWEATHER_API_KEY) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(lokasi)},ID&appid=${apiKey}&units=metric&lang=id`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const data: any = await res.json();
          const kondisi = data.weather[0].description;
          const suhu = Math.round(data.main.temp);
          const kelembaban = data.main.humidity;
          const angin = Math.round(data.wind.speed * 3.6); // m/s to km/h

          const isHujan = kondisi.toLowerCase().includes("rain") || kondisi.toLowerCase().includes("hujan");
          const dampak = isHujan
            ? "Waspadai jalan licin saat pengiriman. Tunda penjemuran hasil panen."
            : "Cuaca aman untuk aktivitas panen dan pengiriman ke SPPG.";

          return {
            sumber: "OpenWeatherMap API (Real-Time)",
            lokasi: data.name || lokasi,
            status_cuaca: kondisi,
            suhu_celsius: suhu,
            kelembaban_persen: kelembaban,
            kecepatan_angin_kmh: angin,
            dampak_pertanian: dampak,
            rekomendasi_ai: `Cuaca di ${lokasi}: ${kondisi}, ${suhu}°C. ${dampak}`
          };
        }
      } catch (err: any) {
        console.warn("⚠️  [MCP Weather] API gagal, fallback ke simulasi:", err.message);
      }
    }

    // --- FALLBACK SIMULASI (deterministik berdasarkan lokasi + jam saat ini) ---
    const jam = new Date().getHours();
    const hashBase = hashLokasi(lokasi.toLowerCase()) + jam;
    const idx = hashBase % KONDISI_CUACA.length;
    const cuaca = KONDISI_CUACA[idx];

    // Tambah sedikit variasi suhu agar terlihat natural
    const variasiSuhu = (hashLokasi(lokasi) % 5) - 2; // -2 sampai +2 derajat

    return {
      sumber: "BMKG (Badan Meteorologi Klimatologi & Geofisika) - Simulated MCP",
      lokasi,
      status_cuaca: cuaca.status,
      suhu_celsius: cuaca.suhu + variasiSuhu,
      kelembaban_persen: cuaca.kelembaban,
      kecepatan_angin_kmh: cuaca.angin,
      dampak_pertanian: cuaca.dampak,
      rekomendasi_ai: cuaca.rekomendasi
    };
  }
}
