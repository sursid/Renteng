import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding data (Mock Data based on Kemenkop Stats)...');

  // 1. Data Koperasi (Berdasarkan Top 5 Provinsi dari Dashboard Simkopdes)
  // Kita buat beberapa sample data untuk mendemokan seolah-olah sistem terhubung dengan ribuan data.
  const koperasis = [
    { idDesa: '33.01.01.2001', namaKoperasi: 'Koperasi Merah Putih Tani Maju (Jateng)', tingkatModernisasi: 'Menengah', saldoKas: 15000000.00, status: 'aktif' },
    { idDesa: '35.01.01.2002', namaKoperasi: 'Koperasi Karya Makmur (Jatim)', tingkatModernisasi: 'Dasar', saldoKas: 5000000.00, status: 'aktif' },
    { idDesa: '11.01.01.2003', namaKoperasi: 'Koperasi Saudagar Aceh (Aceh)', tingkatModernisasi: 'Lanjut', saldoKas: 45000000.00, status: 'aktif' },
    { idDesa: '12.01.01.2004', namaKoperasi: 'Koperasi Harapan Tani (Sumut)', tingkatModernisasi: 'Menengah', saldoKas: 12000000.00, status: 'aktif' },
    { idDesa: '32.01.01.2005', namaKoperasi: 'Koperasi Siliwangi Mandiri (Jabar)', tingkatModernisasi: 'Lanjut', saldoKas: 28000000.00, status: 'aktif' },
  ];

  console.log('Menyuntikkan data Koperasi...');
  for (const kop of koperasis) {
    await prisma.koperasi.create({ data: kop });
  }

  const allKoperasi = await prisma.koperasi.findMany();

  // 2. Data SPPG (Dapur Makan Bergizi Gratis)
  console.log('Menyuntikkan data Dapur SPPG...');
  const sppgs = [
    { idKoperasi: allKoperasi[0].id, namaSppg: 'Dapur Satelit SD 01 Tani Maju', alamat: 'Jl. Merdeka No 1', kapasitasHarian: 500 },
    { idKoperasi: allKoperasi[1].id, namaSppg: 'Dapur Satelit SD 03 Karya Makmur', alamat: 'Jl. Pahlawan No 10', kapasitasHarian: 300 },
  ];
  for (const sppg of sppgs) {
    await prisma.sppg.create({ data: sppg });
  }

  // 3. Data Anggota / Warga Desa (Supplier)
  console.log('Menyuntikkan data Anggota/Warga...');
  const anggotas = [
    { idKoperasi: allKoperasi[0].id, nama: 'Bapak Budi (Petani Beras)', noWhatsapp: '081234567890', kategoriUsaha: 'Pertanian', komoditas: 'Beras', optInConsent: true },
    { idKoperasi: allKoperasi[0].id, nama: 'Ibu Siti (Peternak Telur)', noWhatsapp: '081234567891', kategoriUsaha: 'Peternakan', komoditas: 'Telur', optInConsent: true },
    { idKoperasi: allKoperasi[1].id, nama: 'Bapak Joko (Petani Sayur)', noWhatsapp: '081234567892', kategoriUsaha: 'Pertanian', komoditas: 'Sayur Kol', optInConsent: true },
    { idKoperasi: allKoperasi[1].id, nama: 'Ibu Rina (Supplier Minyak)', noWhatsapp: '081234567893', kategoriUsaha: 'Perdagangan', komoditas: 'Minyak Goreng', optInConsent: false },
  ];
  for (const anggota of anggotas) {
    await prisma.anggota.create({ data: anggota });
  }

  const allAnggota = await prisma.anggota.findMany();
  const allSppg = await prisma.sppg.findMany();

  // 4. Data Produksi Harian (Stok hari ini)
  console.log('Menyuntikkan data Produksi Harian...');
  await prisma.produksiHarian.createMany({
    data: [
      { idAnggota: allAnggota[0].id, tanggal: new Date(), jumlahProduksi: 100, jumlahTersedia: 80 },
      { idAnggota: allAnggota[1].id, tanggal: new Date(), jumlahProduksi: 500, jumlahTersedia: 500 },
      { idAnggota: allAnggota[2].id, tanggal: new Date(), jumlahProduksi: 50, jumlahTersedia: 40 },
    ]
  });

  // 5. Data Kebutuhan SPPG (Order / Demand dari Dapur)
  console.log('Menyuntikkan data Kebutuhan SPPG...');
  await prisma.kebutuhanSppg.createMany({
    data: [
      { idSppg: allSppg[0].id, produk: 'Beras', jumlah: 50, hargaMaksimal: 15000.00 },
      { idSppg: allSppg[0].id, produk: 'Telur', jumlah: 200, hargaMaksimal: 3000.00 },
      { idSppg: allSppg[1].id, produk: 'Sayur Kol', jumlah: 20, hargaMaksimal: 10000.00 },
    ]
  });

  console.log('✅ Seeding Selesai! Data siap digunakan untuk presentasi Juri.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
