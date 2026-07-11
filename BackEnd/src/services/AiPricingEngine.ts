export class AiPricingEngine {
  static kalkulasiHpp(produk: string, biayaBahanBaku: number, biayaTenagaKerja: number) {
    const hpp = biayaBahanBaku + biayaTenagaKerja;
    const margin = hpp * 0.20;
    const hargaJualRekomendasi = hpp + margin;
    return {
      success: true,
      data: {
        produk,
        biayaBahanBaku,
        biayaTenagaKerja,
        hpp,
        marginKeuntungan: margin,
        marginPersen: '20%',
        hargaJualRekomendasi,
        catatan: `Harga jual Rp ${hargaJualRekomendasi.toLocaleString('id-ID')} sudah termasuk margin 20% untuk perlindungan petani.`
      }
    };
  }
}
