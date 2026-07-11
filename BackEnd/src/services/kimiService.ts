import { Buffer } from "buffer";

export async function askKimi(prompt: string, useThinking: boolean = true): Promise<string | null> {
  const url = "https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat";

  // Header wajib sesuai instruksi (termasuk Auth, Cookie, dan x-msh headers)
  const headers = {
    "accept": "*/*",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc4NjEyOTEzOCwiaWF0IjoxNzgzNTM3MTM4LCJqdGkiOiJkOTc5cnNrZGVpanFmNGY5MTcyZyIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJkNXQyYWlnYzg2czhxbDBhYjUxMCIsInNwYWNlX2lkIjoiZDV0MmFpZ2M4NnM4cWwwYWF0ZTAiLCJhYnN0cmFjdF91c2VyX2lkIjoiZDV0MmFpZ2M4NnM4cWwwYWF0ZGciLCJzc2lkIjoiMTczMTUzNzI5OTcyMDMzNTczMyIsImRldmljZV9pZCI6Ijc2MDA0MjgyNTY0NzQ0ODA2NTIiLCJyZWdpb24iOiJvdmVyc2VhcyIsIm1lbWJlcnNoaXAiOnsibGV2ZWwiOjEwfX0.tzXAvPa2-nLy1DRamMzC8WKASMVRfPtKu83VLw_V_ZgsLQWcV0CB0giKs28pOt0aohMMMjHz0mSHBkZD4Ir_hA",
    "connect-protocol-version": "1",
    "content-type": "application/connect+json",
    "cookie": "theme=dark; __snaker__id=HwUEXkop65EBprme; kimi-auth=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc4NjEyOTEzOCwiaWF0IjoxNzgzNTM3MTM4LCJqdGkiOiJkOTc5cnNrZGVpanFmNGY5MTcyZyIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJkNXQyYWlnYzg2czhxbDBhYjUxMCIsInNwYWNlX2lkIjoiZDV0MmFpZ2M4NnM4cWwwYWF0ZTAiLCJhYnN0cmFjdF91c2VyX2lkIjoiZDV0MmFpZ2M4NnM4cWwwYWF0ZGciLCJzc2lkIjoiMTczMTUzNzI5OTcyMDMzNTczMyIsImRldmljZV9pZCI6Ijc2MDA0MjgyNTY0NzQ0ODA2NTIiLCJyZWdpb24iOiJvdmVyc2VhcyIsIm1lbWJlcnNoaXAiOnsibGV2ZWwiOjEwfX0.tzXAvPa2-nLy1DRamMzC8WKASMVRfPtKu83VLw_V_ZgsLQWcV0CB0giKs28pOt0aohMMMjHz0mSHBkZD4Ir_hA; doodle_asset=%257B%2522id%2522%253A%252219f37ac5-66d2-80a7-8000-000058fb43bd%2522%252C%2522assetUrl%2522%253A%2522https%253A%252F%252Fkimi-img.moonshot.cn%252Fpub%252Fslides%252Fkimi-fs%252Foutsight%252F260706-21%253A43%253A20_kimiavator_homepage_worldcup%2525281%252529.riv%2522%252C%2522link%2522%253A%257B%2522%2524typeName%2522%253A%2522kimi.gateway.doodle.v1.Link%2522%252C%2522doodleLink%2522%253A%2522https%253A%252F%252Fwww.kimi.com%252Ftoken-cup%253Ffrom%253Dsidebar%2522%257D%252C%2522welcomeMessage%2522%253A%257B%2522%2524typeName%2522%253A%2522kimi.gateway.doodle.v1.WelcomeMessage%2522%252C%2522messages%2522%253A%257B%2522en-US%2522%253A%2522Hi%2520Djekeel%2520Djekel%252C%2520let's%2520cheer%2520for%2520the%2520passion%2522%252C%2522zh-CN%2522%253A%2522%25E5%2597%25A8%2520Djekeel%2520Djekel%25EF%25BC%258C%25E5%2592%258C%2520Kimi%2520%25E4%25B8%2580%25E8%25B5%25B7%25E4%25B8%25BA%25E7%2583%25AD%25E7%2588%25B1%25E5%258A%25A9%25E5%25A8%2581%2522%257D%257D%252C%2522userName%2522%253A%2522Djekeel%2520Djekel%2522%257D; __cf_bm=Is5Mws6BNkpnEVAbgx6xGnlaZwHpTI1HvKV8pSKmAT8-1783537260.7688904-1.0.1.1-KhMy6Ueu4LM2Fkp4RAj_GztbLlwuc2YyEBErPJsrw6NvZoXI4ANTureHrAu2LTb9YqrAsiurm.bIzkPeRkDhcDzh2V10fDHmY.vdPgaX8TS_v9juXvsTkoKoDl2e_eNg",
    "origin": "https://www.kimi.com",
    "priority": "u=1, i",
    "r-timezone": "Asia/Jakarta",
    "referer": "https://www.kimi.com/",
    "sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Brave";v="150"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sec-gpc": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
    "x-language": "en-US",
    "x-msh-device-id": "7600428256474480652",
    "x-msh-platform": "web",
    "x-msh-session-id": "1731537299720335733",
    "x-msh-shield-data": "sg:bgGINWFQ4BSLHYSlQaPSFpGoFr",
    "x-msh-version": "1.0.0",
    "x-traffic-id": "d5t2aigc86s8ql0ab510"
  };

  const payloadObj = {
    "scenario": "SCENARIO_K2D5",
    "tools": [
      { "type": "TOOL_TYPE_SEARCH", "search": {} },
      { "type": "TOOL_TYPE_CRON_JOB" }
    ],
    "message": {
      "role": "user",
      "blocks": [{ "message_id": "", "text": { "content": prompt } }],
      "scenario": "SCENARIO_K2D5",
      "is_goal": false
    },
    "options": {
      "thinking": useThinking,
      "enable_plugin": true
    }
  };

  const jsonStr = JSON.stringify(payloadObj);
  const jsonBytes = new TextEncoder().encode(jsonStr);

  // MISTERI "5 KOTAK": Format Protocol gRPC-Web / Connect
  // Terdiri dari 5 bytes prefix (1 byte flag + 4 bytes panjang JSON)
  const header = new Uint8Array(5);
  header[0] = 0; // 0 artinya tidak di-compress
  
  const length = jsonBytes.length;
  // 4 bytes panjang payload (Big-Endian)
  header[1] = (length >> 24) & 0xFF;
  header[2] = (length >> 16) & 0xFF;
  header[3] = (length >> 8) & 0xFF;
  header[4] = length & 0xFF;

  // Gabungkan 5-byte header kotak dengan JSON payload
  const body = new Uint8Array(5 + length);
  body.set(header, 0);
  body.set(jsonBytes, 5);

  console.log(`🚀 Mengirim request ke Kimi API (Prompt: "${prompt.slice(0, 50)}...", Mode: ${useThinking ? 'Thinking' : 'Biasa'})...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      console.error("❌ Error HTTP:", response.status, response.statusText);
      // FALLBACK JIKA LIMIT: MATIKAN THINKING MODE
      if (response.status === 429 && useThinking) {
         console.log("⚠️ Limit Kimi tercapai! Melakukan fallback ke mode biasa (thinking: false)...");
         return await askKimi(prompt, false);
      }
      return null;
    }

    console.log("✅ Berhasil Connect! Menunggu stream balasan dari Kimi...\n");

    let fullResponse = "";
    
    // Karena ini stream yang ada 5-byte kotaknya juga (gRPC), kita parse pelan-pelan
    const reader = response.body?.getReader();
    if (!reader) return null;

    let buffer = new Uint8Array(0);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Gabungkan chunk baru ke buffer
      const newBuffer = new Uint8Array(buffer.length + value.length);
      newBuffer.set(buffer, 0);
      newBuffer.set(value, buffer.length);
      buffer = newBuffer;

      // Proses selama buffer cukup untuk header (5 bytes) dan isinya
      while (buffer.length >= 5) {
        // Ambil panjang pesan (4 bytes setelah byte pertama)
        const msgLen = (buffer[1]! << 24) | (buffer[2]! << 16) | (buffer[3]! << 8) | buffer[4]!;
        
        // Kalau buffer belum utuh menampung 1 pesan, tunggu chunk berikutnya
        if (buffer.length < 5 + msgLen) {
          break;
        }

        // Ekstrak pesan JSON
        const msgBytes = buffer.slice(5, 5 + msgLen);
        const msgText = new TextDecoder().decode(msgBytes);

        try {
          const parsed = JSON.parse(msgText);
          
          if (parsed.op === "append" || parsed.op === "set") {
            if (parsed.mask === "block.text.content" || parsed.mask === "block.text") {
              const textChunk = parsed.block?.text?.content;
              if (textChunk) {
                fullResponse += textChunk;
                process.stdout.write(textChunk);
              }
            } else if (parsed.mask === "block.think.content" || parsed.mask === "block.think") {
              const thinkChunk = parsed.block?.think?.content;
              // process.stdout.write(thinkChunk); // Opsional kalau mau nge-print thinkingnya
            }
          }
        } catch (e) {
          // Abaikan kalau gagal parse JSON chunk
        }

        // Buang pesan yang sudah diproses dari buffer
        buffer = buffer.slice(5 + msgLen);
      }
    }
    console.log("\n\n🎉 Selesai!");
    return fullResponse;
  } catch (err) {
    console.error("❌ Gagal fetch:", err);
    return null;
  }
}
