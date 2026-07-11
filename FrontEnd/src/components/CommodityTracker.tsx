import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCw, Search, ArrowUpRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { CommodityPrice } from '../types';

const getCommodityImage = (id: string) => {
  switch (id) {
    case 'cabai': return '/bahan-pangan/1.svg';
    case 'padi': return '/bahan-pangan/2.svg';
    case 'jagung': return '/bahan-pangan/3.svg';
    case 'kopi': return '/bahan-pangan/4.svg';
    case 'bawang': return '/bahan-pangan/5.svg';
    case 'tempe': return '/bahan-pangan/6.svg';
    default: return null;
  }
};

export default function CommodityTracker({ refreshTrigger }: { refreshTrigger?: number }) {
  const [prices, setPrices] = useState<CommodityPrice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/komoditas`);
      if (!response.ok) {
        throw new Error('Gagal memuat data harga komoditas terbaru');
      }
      const data = await response.json();
      setPrices(data.prices);
      setLastUpdated(data.lastUpdated);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Koneksi ke server terputus');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, [refreshTrigger]);

  const filteredPrices = prices.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.info.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-[#F3F1EA] border border-art-charcoal/10 rounded-3xl p-6" id="harga-komoditas">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-art-charcoal/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-art-sage opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-art-sage"></span>
            </span>
            <h3 className="font-serif italic text-2xl text-art-charcoal">Info Harga Komoditas Desa</h3>
          </div>
          <p className="text-xs uppercase tracking-widest text-art-charcoal/60 mt-0.5">Pantau harga pasar tani langsung di tingkat koperasi desa</p>
        </div>

        <button
          type="button"
          id="btn-refresh-prices"
          onClick={fetchPrices}
          disabled={loading}
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold px-4 py-2 border border-art-charcoal/10 rounded-lg text-art-charcoal bg-white hover:bg-art-charcoal hover:text-white transition-all duration-300 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Memperbarui...' : 'Perbarui'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-art-charcoal/60" />
          <input
            type="text"
            id="input-search-prices"
            placeholder="Cari komoditas (misal: Tempe, Telur, Beras GKG)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-art-charcoal/10 rounded-xl text-sm text-art-charcoal placeholder-art-charcoal/40 focus:outline-none focus:border-art-sage focus:ring-1 focus:ring-art-sage/20 transition-all"
          />
        </div>
        {lastUpdated && (
          <div className="flex items-center justify-end text-xs text-art-charcoal/60 font-mono self-center bg-white/50 px-3 py-1.5 rounded-lg border border-art-charcoal/5">
            Pembaruan Terakhir: {lastUpdated}
          </div>
        )}
      </div>

      {loading && prices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <RefreshCw className="w-8 h-8 text-art-sage animate-spin" />
          <p className="text-sm text-art-charcoal/60">Menghubungkan ke pusat data tani...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-center max-w-md mx-auto">
          <p className="text-sm text-red-800 mb-4">{error}</p>
          <button
            type="button"
            id="btn-retry-prices"
            onClick={fetchPrices}
            className="text-xs bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors font-medium"
          >
            Coba Lagi
          </button>
        </div>
      ) : filteredPrices.length === 0 ? (
        <div className="p-8 text-center text-art-charcoal/60 text-sm border border-dashed border-art-charcoal/20 rounded-2xl bg-white/40">
          Komoditas tidak ditemukan. Coba ketik kata kunci lain.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrices.map((p, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={p.id}
              className="bg-white border border-art-charcoal/10 rounded-2xl p-6 hover:border-art-sage/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
            >
              {getCommodityImage(p.id) && (
                <div className="absolute right-0 bottom-0 w-36 h-36 opacity-15 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none select-none z-0 translate-x-2 translate-y-2">
                  <img 
                    src={getCommodityImage(p.id)!} 
                    alt={p.name} 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div className="relative z-10">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <h4 className="font-serif italic text-lg font-bold text-art-charcoal pr-16">{p.name}</h4>
                  <span className={`flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                    p.trend === 'up' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-800/15' 
                      : p.trend === 'down'
                      ? 'bg-red-50 text-red-800 border border-red-800/15'
                      : 'bg-art-beige text-art-charcoal/70 border border-art-charcoal/10'
                  }`}>
                    {p.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />}
                    {p.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-700" />}
                    {p.change}
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5 my-4">
                  <span className="font-serif italic text-2xl font-bold text-art-charcoal">{formatRupiah(p.price)}</span>
                  <span className="text-art-charcoal/60 text-xs font-medium">/ {p.unit}</span>
                </div>

                <p className="text-xs text-art-charcoal/80 leading-relaxed mb-2 max-w-[85%]">{p.info}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-8 p-5 bg-white border border-art-charcoal/10 rounded-2xl flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-art-sage shrink-0 mt-0.5" />
        <div className="text-xs text-art-charcoal/90 leading-relaxed">
          <p className="font-serif italic text-sm text-art-charcoal mb-1">Pemberitahuan Penyaluran Pangan SPPG:</p>
          <p>Seluruh anggota koperasi yang telah mengaktifkan persetujuan UU PDP berhak menyuplai hasil hilirisasi pangan (Beras, Tempe, Telur, Cabai) langsung ke Dapur SPPG. Gunakan asisten WhatsApp untuk kalkulasi HPP dan mendaftarkan kuota harian Anda.</p>
        </div>
      </div>
    </div>
  );
}
