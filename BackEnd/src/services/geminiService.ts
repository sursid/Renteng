import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function askGemini(prompt: string): Promise<string | null> {
  const keysPath = path.join(__dirname, "..", "..", "gemini_keys.json");
  
  let keys: string[] = [];
  try {
    const data = await fs.readFile(keysPath, "utf-8");
    keys = JSON.parse(data);
  } catch (err) {
    console.error("❌ Gagal membaca gemini_keys.json!", err);
    return null;
  }

  // Filter keys (hindari placeholder)
  const validKeys = keys.filter(k => k && !k.includes("API_KEY_"));

  if (validKeys.length === 0) {
    console.error("❌ Tidak ada API Key Gemini yang valid di gemini_keys.json!");
    return null;
  }

  console.log(`🚀 [FALLBACK] Mengirim request ke Gemini API (Memiliki ${validKeys.length} kunci cadangan)...`);

  const geminiModels = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-pro",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
  ];

  for (let i = 0; i < validKeys.length; i++) {
    const apiKey = validKeys[i];
    console.log(`🔑 Menggunakan API Key #${i + 1}...`);
    
    for (let j = 0; j < geminiModels.length; j++) {
      const modelName = geminiModels[j];
      try {
        const genAI = new GoogleGenerativeAI(apiKey || "");
        const model = genAI.getGenerativeModel({ model: modelName || "gemini-1.5-flash" });

        console.log(`  🤖 Mencoba Model: ${modelName}...`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`  ✅ Berhasil mendapatkan balasan menggunakan Model ${modelName} (Key #${i + 1})!`);
        return text;

      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        console.warn(`  ⚠️ Model ${modelName} gagal: ${errorMsg.slice(0, 50)}... Melanjutkan ke model berikutnya...`);
        // Jika model ini gagal/limit, lanjut ke model berikutnya (inner loop)
      }
    }
    
    console.warn(`❌ Semua model gagal untuk API Key #${i + 1}. Beralih ke API Key berikutnya...`);
  }

  console.error("❌ Semua API Key & Semua Model Gemini gagal!");
  return null;
}
