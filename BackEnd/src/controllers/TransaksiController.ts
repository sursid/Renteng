import { prisma } from "../../lib/db";

export const TransaksiController = {
  // 1. Cek Saldo Petani
  async getSaldo({ query, set }: any) {
    try {
      const { noWa } = query;
      if (!noWa) {
        set.status = 400;
        return { success: false, message: "Nomor WA diperlukan" };
      }

      let searchNomor = noWa;
      if (searchNomor.startsWith("62")) searchNomor = searchNomor.substring(2);
      if (searchNomor.startsWith("0")) searchNomor = searchNomor.substring(1);

      const anggota = await prisma.anggota.findFirst({
        where: { noWhatsapp: { endsWith: searchNomor } }
      });

      if (!anggota) {
        set.status = 404;
        return { success: false, message: "Anggota tidak ditemukan" };
      }

      return { success: true, saldo: anggota.saldo };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  // 2. Request Tarik Tunai
  async tarikTunai({ body, set }: any) {
    try {
      const { noWa, jumlah } = body;
      if (!noWa || !jumlah || jumlah <= 0) {
        set.status = 400;
        return { success: false, message: "Data tidak valid" };
      }

      // Normalisasi
      let searchNomor = noWa;
      if (searchNomor.startsWith("62")) searchNomor = searchNomor.substring(2);
      if (searchNomor.startsWith("0")) searchNomor = searchNomor.substring(1);

      const anggota = await prisma.anggota.findFirst({
        where: { noWhatsapp: { endsWith: searchNomor } }
      });

      if (!anggota) {
        set.status = 404;
        return { success: false, message: "Anggota tidak ditemukan" };
      }

      if (Number(anggota.saldo) < jumlah) {
        set.status = 400;
        return { success: false, message: "Maaf Pak/Bu, saldo di tabungan tidak cukup untuk ditarik sebanyak itu." };
      }

      // Potong saldo & catat log penarikan secara atomik
      await prisma.$transaction([
        prisma.anggota.update({
          where: { id: anggota.id },
          data: { saldo: { decrement: jumlah } }
        }),
        prisma.tarikTunai.create({
          data: {
            idAnggota: anggota.id,
            jumlah,
            status: "pending"
          }
        })
      ]);

      return { success: true, message: `Tarik uang Rp ${jumlah} sudah dicatat. Silakan ambil uangnya di kantor koperasi ya.` };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  // 2.5 Approve Tarik Tunai (Admin)
  async approveTarikTunai({ body, set }: any) {
    try {
      const { id, buktiTransfer } = body;

      const penarikan = await prisma.tarikTunai.findUnique({
        where: { id: Number(id) }
      });

      if (!penarikan) {
        set.status = 404;
        return { success: false, message: "Data penarikan tidak ditemukan" };
      }

      if (penarikan.status !== "pending") {
        set.status = 400;
        return { success: false, message: `Penarikan ini sudah berstatus ${penarikan.status}` };
      }

      await prisma.tarikTunai.update({
        where: { id: Number(id) },
        data: {
          status: "success",
          buktiTransfer: buktiTransfer || null
        }
      });

      return { success: true, message: "Penarikan berhasil disetujui." };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  // 3. Konfirmasi DITERIMA dari SPPG -> Potong 3% fee, tambah saldo
  async selesaiTransaksi({ body, set }: any) {
    try {
      const { idOrder, noWa } = body;

      if (!noWa) {
        set.status = 400;
        return { success: false, message: "Nomor WhatsApp diperlukan." };
      }

      let searchNomor = String(noWa);
      if (searchNomor.startsWith("62")) searchNomor = searchNomor.substring(2);
      if (searchNomor.startsWith("0")) searchNomor = searchNomor.substring(1);

      const sender = await prisma.anggota.findFirst({
        where: { noWhatsapp: { endsWith: searchNomor } }
      });

      if (!sender || (sender.kategoriUsaha !== "Admin SPPG" && sender.kategoriUsaha !== "Juri")) {
        set.status = 403;
        return { success: false, message: "Hanya Admin SPPG atau Juri yang berhak menyelesaikan pesanan." };
      }
      
      let order = null;

      if (idOrder) {
        order = await prisma.kebutuhanSppg.findUnique({
          where: { id: Number(idOrder) }
        });
      } else {
        const sppgList = await prisma.sppg.findMany({
          where: { idKoperasi: sender.idKoperasi }
        });
        const sppgIds = sppgList.map(s => s.id);

        const lockedOrders = await prisma.kebutuhanSppg.findMany({
          where: {
            idSppg: { in: sppgIds },
            status: { in: ["locked", "in_transit"] }
          },
          orderBy: { updatedAt: "desc" }
        });

        if (lockedOrders.length === 1) {
          order = lockedOrders[0];
        } else if (lockedOrders.length > 1) {
          set.status = 400;
          return { 
            success: false, 
            message: "Bapak/Ibu punya beberapa pesanan yang sedang berjalan.",
            data: {
              multiple: true,
              orders: lockedOrders.map(o => ({ id: o.id, produk: o.produk, jumlah: o.jumlah, satuan: o.satuan }))
            }
          };
        }
      }

      if (!order) {
         set.status = 404;
         return { success: false, message: "Tidak ada pesanan aktif bapak/ibu yang sedang menunggu pengiriman." };
      }

      if (order.status !== "locked" && order.status !== "in_transit") {
         set.status = 400;
         return { success: false, message: "Pesanan ini belum disetujui oleh Petani." };
      }

      // Cari siapa petani yang mengunci pesanan ini
      const matching = await prisma.aiMatching.findFirst({
        where: { idOrder: order.id },
        include: { kebutuhan: true }
      });

      if (!matching) {
        set.status = 404;
        return { success: false, message: "Data matching tidak ditemukan." };
      }

      // Hitung uang
      const totalNilai = order.jumlah * Number(order.hargaMaksimal);
      const serviceFee = totalNilai * 0.03; // 3% fee Koperasi
      const bersihUntukPetani = totalNilai - serviceFee;

      // Ambil idKoperasi dari data anggota petani
      const anggotaPetani = await prisma.anggota.findUnique({
        where: { id: matching.idAnggota },
        select: { idKoperasi: true }
      });

      if (!anggotaPetani) {
        set.status = 404;
        return { success: false, message: "Koperasi anggota tidak ditemukan." };
      }

      // Jalankan transaksi database secara atomik (mencegah financial leak)
      await prisma.$transaction([
        prisma.anggota.update({
          where: { id: matching.idAnggota },
          data: { 
            saldo: { increment: bersihUntukPetani },
            creditScore: { increment: 10 }
          }
        }),
        prisma.koperasi.update({
          where: { id: anggotaPetani.idKoperasi },
          data: { saldoKas: { increment: serviceFee } }
        }),
        prisma.transaksi.create({
          data: {
            idOrder: order.id,
            idSupplier: matching.idAnggota,
            nilaiTransaksi: totalNilai,
            serviceFee: serviceFee,
            nilaiSupplier: bersihUntukPetani
          }
        }),
        prisma.kebutuhanSppg.update({
          where: { id: order.id },
          data: { status: "closed" }
        })
      ]);

      return { success: true, message: `Uang hasil panen Rp ${bersihUntukPetani.toLocaleString('id-ID')} sudah masuk ke tabungan koperasi bapak/ibu.` };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  },

  // 4. Barang Mulai Berangkat (dipanggil oleh petani/supplier)
  async berangkatTransaksi({ body, set }: any) {
    try {
      const { idOrder, noWa } = body;
      
      if (!noWa) {
        set.status = 400;
        return { success: false, message: "Nomor WhatsApp diperlukan." };
      }

      let searchNomor = String(noWa);
      if (searchNomor.startsWith("62")) searchNomor = searchNomor.substring(2);
      if (searchNomor.startsWith("0")) searchNomor = searchNomor.substring(1);

      const sender = await prisma.anggota.findFirst({
        where: { noWhatsapp: { endsWith: searchNomor } }
      });

      if (!sender) {
        set.status = 404;
        return { success: false, message: "Anggota tidak ditemukan." };
      }

      // CATATAN: Endpoint ini TIDAK membatasi role — petani/supplier berhak
      // mengupdate status pengiriman order mereka sendiri.

      let order = null;

      if (idOrder) {
        // Jika idOrder diberikan, pastikan order ini benar-benar milik petani ini
        // (validasi via aiMatching agar petani tidak bisa update order orang lain)
        const candidate = await prisma.kebutuhanSppg.findUnique({
          where: { id: Number(idOrder) },
          include: { sppg: true }
        });

        if (candidate) {
          const matching = await prisma.aiMatching.findFirst({
            where: { idOrder: candidate.id, idAnggota: sender.id }
          });
          if (!matching) {
            set.status = 403;
            return { success: false, message: "Pesanan ini bukan milik Bapak/Ibu." };
          }
          order = candidate;
        }
      } else {
        // Cari semua order locked yang terhubung ke petani ini via aiMatching
        const lockedOrders = await prisma.kebutuhanSppg.findMany({
          where: {
            status: "locked",
            aiMatching: {
              some: {
                idAnggota: sender.id
              }
            }
          },
          include: { sppg: true },
          orderBy: { updatedAt: "desc" }
        });

        if (lockedOrders.length === 1) {
          order = lockedOrders[0];
        } else if (lockedOrders.length > 1) {
          // Multiple orders — kembalikan pilihan ke bot agar bisa ditampilkan ke petani
          return {
            success: false,
            data: {
              multiple: true,
              orders: lockedOrders.map(o => ({ id: o.id, produk: o.produk, jumlah: o.jumlah, satuan: o.satuan }))
            }
          };
        }
      }

      if (!order) {
        set.status = 404;
        return { success: false, message: "Tidak ada pesanan aktif Bapak/Ibu yang siap berangkat." };
      }

      if (order.status !== "locked") {
        set.status = 400;
        return { success: false, message: "Pesanan ini tidak bisa dikirim karena statusnya bukan terkunci." };
      }

      // Update status ke in_transit
      await prisma.kebutuhanSppg.update({
        where: { id: order.id },
        data: { status: "in_transit" }
      });

      // Hitung ETA pakai MapsMcp
      let jarakInfo: { estimasi_waktu_tempuh_menit: number | string; estimasi_jarak_km: number | string } = {
        estimasi_waktu_tempuh_menit: "-",
        estimasi_jarak_km: "-"
      };
      try {
        const { MapsMcp } = await import("../services/mcp/MapsMcp");
        const alamatPetani = sender.alamat || "Gudang Petani";
        const alamatSppg = order.sppg?.alamat || "Dapur SPPG";
        jarakInfo = await MapsMcp.getDistance(alamatPetani, alamatSppg);
      } catch (mapsErr) {
        console.warn("[MapsMcp] Gagal hitung jarak:", mapsErr);
      }

      // Cari admin SPPG di koperasi yang sama untuk dikirimi notifikasi
      const adminSppg = await prisma.anggota.findFirst({
        where: {
          idKoperasi: order.sppg?.idKoperasi,
          kategoriUsaha: "Admin SPPG"
        }
      });

      // Kirim WhatsApp alert ke Admin SPPG jika terdaftar
      if (adminSppg && adminSppg.noWhatsapp) {
        try {
          const sock = (await import("../../whatsapp.js")).getSocket();
          if (sock) {
            let formatTarget = adminSppg.noWhatsapp;
            if (formatTarget.startsWith("0")) formatTarget = "62" + formatTarget.substring(1);
            else if (!formatTarget.startsWith("62")) formatTarget = "62" + formatTarget;
            const targetJid = formatTarget + "@s.whatsapp.net";
            
            const alertMsg = `🚚 *[PENGIRIMAN PASOKAN]* 🚚\n\n`
              + `Halo ${adminSppg.nama}, pesanan Bapak/Ibu sedang di jalan:\n`
              + `1. Barang: *${order.produk}*\n`
              + `2. Jumlah: *${order.jumlah} ${order.satuan}*\n`
              + `3. Pengirim: *${sender.nama}*\n\n`
              + `⏱️ Perkiraan sampai: *${jarakInfo.estimasi_waktu_tempuh_menit} menit* (${jarakInfo.estimasi_jarak_km} km).\n\n`
              + `Silakan siapkan timbangan dan terima barangnya jika sudah sampai ya Pak/Bu.`;
              
            await sock.sendMessage(targetJid, { text: alertMsg });
            console.log(`[WA BOT] Notifikasi berangkat terkirim ke Admin SPPG ${formatTarget}`);
          }
        } catch (waErr) {
          console.warn("Gagal mengirim notifikasi WA ke SPPG:", waErr);
        }
      }

      return {
        success: true,
        message: `Barang pesanan ${order.produk} sedang dalam perjalanan. Kami akan kabari Admin SPPG!`
      };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  }
};
