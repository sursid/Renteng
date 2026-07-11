'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function LoginRegisterPage() {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  
  // Register Form States
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regNik, setRegNik] = useState<string>('');
  const [regCommodity, setRegCommodity] = useState<string>('Tempe');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regPdpConsent, setRegPdpConsent] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Email/Username dan Kata Sandi harus diisi.');
      return;
    }

    setIsLoading(true);
    try {
      // Dummy Login Validation untuk testing
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay

      if (loginEmail === 'admin' && loginPassword === 'admin') {
        const dummyUser = { name: 'Admin KUD', role: 'admin' };
        localStorage.setItem('token', 'dummy-token-admin-123');
        localStorage.setItem('user', JSON.stringify(dummyUser));

        toast.success('Login pengurus berhasil! Mengalihkan ke dashboard...');
        setTimeout(() => {
          window.location.href = '/?admin=true'; // Redirect to admin portal
        }, 1000);
      } else if (loginEmail === 'user' && loginPassword === 'user') {
        const dummyUser = { name: 'Petani Sejahtera', role: 'anggota' };
        localStorage.setItem('token', 'dummy-token-user-123');
        localStorage.setItem('user', JSON.stringify(dummyUser));

        toast.success('Login berhasil! Selamat datang di RentengPay.');
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        throw new Error('Kredensial salah. Coba gunakan admin/admin atau user/user.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Kredensial tidak cocok.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regNik || !regPassword) {
      toast.error('Mohon isi semua data pendaftaran.');
      return;
    }
    if (!regPdpConsent) {
      toast.error('Anda harus menyetujui ketentuan privasi data (UU PDP) untuk mendaftar.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/anggota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          phone: regPhone,
          role: `Produsen ${regCommodity}`,
          location: 'Desa Subur Makmur',
          nik: regNik,
          opt_in_consent: regPdpConsent
        })
      });

      if (!res.ok) {
        throw new Error('Gagal melakukan pendaftaran. Silakan coba lagi.');
      }

      const data = await res.json();
      toast.success(`Pendaftaran berhasil! Akun ${data.name} terdaftar dengan status Menunggu Verifikasi.`);
      setTimeout(() => {
        setIsLogin(true);
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat mendaftar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main 
      className="h-screen w-full text-art-charcoal font-sans flex flex-col lg:flex-row relative overflow-hidden bg-cover"
      style={{ 
        backgroundImage: 'url("/login-bg.png")',
        backgroundPosition: '20% center'
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent pointer-events-none z-0" />
      
      {/* LEFT SIDE PANEL */}
      <div className="lg:w-[45%] relative hidden lg:flex flex-col justify-between p-8 lg:p-12 text-[#FAF9F6] z-10 h-full">
        
        {/* Back Link */}
        <div className="relative z-10">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FAF9F6] hover:text-[#FAF9F6]/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Tagline Middle */}
        <div className="relative z-10 my-auto py-8">
          <h2 className="text-xl sm:text-2xl font-medium leading-relaxed font-sans max-w-sm tracking-tight text-[#FAF9F6] drop-shadow-md">
            Teman renteng buat catat utang-piutang, tagih otomatis, dan lunas bareng-baregg tanpa ribet dicatat manual.
          </h2>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-[10px] text-[#FAF9F6]/80 uppercase tracking-widest font-mono drop-shadow-md">
          © 2026 RentengPay — teman renteng kamu
        </div>
      </div>

      {/* RIGHT SIDE PANEL (Form area) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative h-full z-10 overflow-y-auto">
        
        {/* Main interactive Card container */}
        <div className="w-full max-w-[480px] bg-white border border-gray-100/50 rounded-[32px] p-6 sm:p-10 lg:p-12 relative mt-8 lg:mt-0">
          
          <AnimatePresence mode="wait">
            {isLogin ? (
              // ==================== LOGIN FORM ====================
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <div className="space-y-2 mb-6">
                  <h1 className="font-serif italic text-3xl sm:text-4xl text-art-charcoal font-bold tracking-tight">
                    Masuk
                  </h1>
                  <p className="text-sm sm:text-base text-art-charcoal/60 leading-relaxed">
                    Akses portal Renteng KUD Anda.
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm uppercase font-bold tracking-widest text-[#1A1A1A] block mb-2.5">
                      Email atau Username
                    </label>
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full bg-[#FAF9F6] border border-art-charcoal/15 focus:border-[#0C683B] focus:ring-2 focus:ring-[#0C683B]/20 rounded-2xl px-5 py-3.5 text-sm sm:text-base text-art-charcoal outline-none placeholder:text-[#A3A095] transition-all"
                    />
                  </div>

                  <div className="relative">
                    <label className="text-xs sm:text-sm uppercase font-bold tracking-widest text-[#1A1A1A] block mb-2.5">
                      Kata Sandi
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••"
                        className="w-full bg-[#FAF9F6] border border-art-charcoal/15 focus:border-[#0C683B] focus:ring-2 focus:ring-[#0C683B]/20 rounded-2xl px-5 py-3.5 pr-14 text-sm sm:text-base text-art-charcoal outline-none placeholder:text-[#A3A095] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-art-charcoal/40 hover:text-art-charcoal transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                      </button>
                    </div>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); alert("Silakan hubungi pengurus KUD di kantor desa untuk reset kata sandi, nggih!"); }}
                      className="text-sm font-bold underline text-art-charcoal/60 hover:text-art-charcoal transition-colors mt-3 block text-right"
                    >
                      Lupa kata sandi?
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#0C683B] hover:bg-[#074e2a] active:scale-[0.99] text-white py-4 rounded-full text-sm sm:text-base uppercase tracking-[0.25em] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-5"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Memuat...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk</span>
                        <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => { setIsLogin(false); }}
                    className="text-sm font-bold text-art-charcoal/60 hover:text-art-charcoal underline cursor-pointer transition-colors"
                  >
                    Belum punya akun? Daftar di sini
                  </button>
                </div>
              </motion.div>
            ) : (
              // ==================== REGISTER FORM ====================
              <motion.div
                key="register-form"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25 }}
              >
                <div className="space-y-2 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A3A095]">Registrasi Anggota</span>
                  <h1 className="font-serif italic text-2xl sm:text-3xl text-art-charcoal font-bold tracking-tight">
                    Mari bergabung secara gotong royong
                  </h1>
                  <p className="text-xs text-art-charcoal/60 leading-relaxed">
                    Daftar sebagai anggota Koperasi RentengPay untuk memasok produk olahan hilirisasi Anda ke Dapur SPPG.
                  </p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A] block mb-1">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Pak/Ibu..."
                        className="w-full bg-[#FAF9F6] border border-art-charcoal/15 focus:border-[#0C683B] focus:ring-2 focus:ring-[#0C683B]/20 rounded-2xl px-4 py-2.5 text-xs text-art-charcoal outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A] block mb-1">
                        Nomor WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="081..."
                        className="w-full bg-[#FAF9F6] border border-art-charcoal/15 focus:border-[#0C683B] focus:ring-2 focus:ring-[#0C683B]/20 rounded-2xl px-4 py-2.5 text-xs text-art-charcoal outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A] block mb-1">
                        Nomor NIK (KTP)
                      </label>
                      <input
                        type="text"
                        value={regNik}
                        onChange={(e) => setRegNik(e.target.value)}
                        placeholder="3404..."
                        maxLength={16}
                        className="w-full bg-[#FAF9F6] border border-art-charcoal/15 focus:border-[#0C683B] focus:ring-2 focus:ring-[#0C683B]/20 rounded-2xl px-4 py-2.5 text-xs text-art-charcoal outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A] block mb-1">
                        Komoditas Utama
                      </label>
                      <select
                        value={regCommodity}
                        onChange={(e) => setRegCommodity(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-art-charcoal/15 focus:border-[#0C683B] focus:ring-2 focus:ring-[#0C683B]/20 rounded-2xl px-3 py-2.5 text-xs text-art-charcoal outline-none transition-all"
                      >
                        <option value="Tempe">Tempe</option>
                        <option value="Telur">Telur Ayam</option>
                        <option value="Beras">Beras</option>
                        <option value="Cabai">Cabai Rawit</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A] block mb-1">
                      Kata Sandi Akun
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="w-full bg-[#FAF9F6] border border-art-charcoal/15 focus:border-[#0C683B] focus:ring-2 focus:ring-[#0C683B]/20 rounded-2xl px-4 py-2.5 text-xs text-art-charcoal outline-none transition-all"
                    />
                  </div>

                  {/* UU PDP Consent Checkbox */}
                  <div className="flex items-start gap-2 bg-[#EAF4EE]/40 border border-emerald-500/10 p-3 rounded-2xl mt-1">
                    <input
                      type="checkbox"
                      id="pdp-consent"
                      checked={regPdpConsent}
                      onChange={(e) => setRegPdpConsent(e.target.checked)}
                      className="mt-0.5 rounded text-[#0C683B] focus:ring-[#0C683B]/30 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="pdp-consent" className="text-[9px] leading-relaxed text-art-charcoal/80 cursor-pointer select-none">
                      <strong className="text-[#0C683B]">Pernyataan Persetujuan UU PDP:</strong> Saya memberikan hak penuh kepada Koperasi untuk memproses data NIK & kapasitas stok produksi saya guna keperluan agregasi Rantai Pasok SPPG.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#0C683B] hover:bg-[#074e2a] active:scale-[0.99] text-white py-3.5 rounded-full text-[10px] uppercase tracking-[0.25em] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Memproses...' : 'Daftar Akun'}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => { setIsLogin(true); }}
                    className="text-[10px] font-bold text-art-charcoal/60 hover:text-art-charcoal underline cursor-pointer transition-colors"
                  >
                    Sudah punya akun? Masuk di sini
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </main>
  );
}
