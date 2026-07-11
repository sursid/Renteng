import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building, Users, Landmark, Sprout, RefreshCw, ArrowLeft, 
  Check, X, Plus, Edit2, ShieldAlert, BadgePercent, TrendingUp,
  MapPin, Phone, Calendar, ClipboardList, Coins, AlertCircle, Save,
  MessageSquare, Bell, Settings, LogOut, Search, Sparkles, ChevronDown, ChevronRight,
  LineChart, Megaphone, CreditCard, Truck, HelpCircle, Cpu, Smartphone, Loader2, Wifi, WifiOff, Wallet
} from 'lucide-react';
import { Member, Loan, CommodityPrice } from '../types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import {
  Menu,
  MenuTrigger,
  MenuPanel,
  MenuItem,
  MenuSeparator,
  MenuGroup,
  MenuGroupLabel
} from '@/components/animate-ui/components/base/menu';

interface AdminDashboardProps {
  onBack: () => void;
  onRefreshPublicPrices?: () => void;
  initialTab?: string;
  detailId?: string;
}

export default function AdminDashboard({ onBack, onRefreshPublicPrices, initialTab, detailId }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<any>(initialTab || 'ringkasan');

  const handleTabClick = (tab: string) => {
    if (typeof window !== 'undefined') {
      const paths: Record<string, string> = {
        'ringkasan': '/?admin=true',
        'kotak_kuning': '/kotak-kuning',
        'anggota': '/anggota',
        'permodalan': '/permodalan',
        'komoditas': '/komoditas',
        'log_ai_blast': '/log-ai-blast',
        'mitra_tani': '/mitra-tani',
        'kas_service_fee': '/kas-service-fee',
        'pengaturan': '/pengaturan'
      };
      
      const targetPath = paths[tab];
      
      if (targetPath) {
        const targetBase = targetPath.split('?')[0];
        if (window.location.pathname !== targetBase) {
           window.location.href = targetPath;
           return;
        }
      }
      setActiveTab(tab);
    } else {
      setActiveTab(tab);
    }
  };
  const [members, setMembers] = useState<Member[]>(
    Array.from({ length: 25 }).map((_, i) => {
      const roles = ['Petani Padi', 'Petani Cabai', 'Petani Tomat', 'Petani Kedelai', 'Petani Jagung', 'Peternak Ayam', 'Petani Sayur'];
      const villages = ['Sukatani', 'Maju Jaya', 'Makmur', 'Krajan', 'Sumber Mulyo'];
      const statuses = ['Aktif', 'Aktif', 'Aktif', 'Menunggu', 'Aktif'];
      const names = ['Siti Rahma', 'Budi Santoso', 'Agus Wijaya', 'Ibu Aminah', 'Pak Joko', 'Ibu Wati', 'Pak Slamet', 'Mbah Darmo', 'Mas Yanto', 'Ibu Kartini'];
      
      const role = roles[i % roles.length];
      const name = names[i % names.length] + (i >= names.length ? ` ${i}` : '');
      const village = `Desa ${villages[i % villages.length]}`;
      const status = statuses[i % statuses.length];
      const phone = `08${10 + i}-${2000 + i}-${3000 + i}`;
      
      const date = new Date(2026, 0, 10 + i);
      const joinDate = `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleString('id-ID', { month: 'short' })} ${date.getFullYear()}`;
      
      return {
        id: (i + 1).toString(),
        name,
        phone,
        role,
        status,
        joinDate,
        location: village
      };
    })
  );
  const [memberCurrentPage, setMemberCurrentPage] = useState(1);
  const [kasCurrentPage, setKasCurrentPage] = useState(1);
  const memberItemsPerPage = 5;
  const kasItemsPerPage = 5;
  const [loans, setLoans] = useState<Loan[]>([]);
  const [commodities, setCommodities] = useState<CommodityPrice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Renteng States
  const [offlineSim, setOfflineSim] = useState<boolean>(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [bukuKasData, setBukuKasData] = useState<any[]>([]);
  const [mitraTaniPage, setMitraTaniPage] = useState(1);
  const [logBlastPage, setLogBlastPage] = useState(1);
  const [membersPage, setMembersPage] = useState(1);
  const [permodalanPage, setPermodalanPage] = useState(1);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [isLoadingBlast, setIsLoadingBlast] = useState(false);
  const [blastLogsData, setBlastLogsData] = useState<any[]>([]);
  const itemsPerPage = 10;
  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [dashboardStats, setDashboardStats] = useState<any>({
    saldoKasKud: { value: 85000000, percentage: 12.4 },
    totalAnggota: { value: 4, percentage: 12 },
    modalDisalurkan: { value: 20000000, percentage: 8 },
    shuKoperasi: { value: 60652000, percentage: 41 },
    serviceFee: { value: 2340000, percentage: 10.4 }
  });
  const [gagalPanenShock, setGagalPanenShock] = useState<number>(0);
  const [hppShock, setHppShock] = useState<number>(0);
  const [nplShock, setNplShock] = useState<number>(0);

  // Form states
  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<number | string | null>(null);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberPhone, setNewMemberPhone] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('Petani Padi');
  const [newMemberLocation, setNewMemberLocation] = useState<string>('Desa Subur Makmur');

  // Global Date Filter
  const [globalDate, setGlobalDate] = useState<Date | undefined>(new Date());
  
  const [editingCommodityId, setEditingCommodityId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<number>(0);
  const [editInfoValue, setEditInfoValue] = useState<string>('');

  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  const handleSaveSettings = () => {
    setIsSavingSettings(true);
    setTimeout(() => {
      setIsSavingSettings(false);
      toast.success('Konfigurasi sistem berhasil disimpan!');
    }, 1500);
  };
  const [shipmentStatuses, setShipmentStatuses] = useState<Record<string, 'Packed' | 'In Transit' | 'Delivered'>>({
    'match-1': 'In Transit',
    'match-2': 'Delivered',
    'match-3': 'Delivered'
  });

  // SPPG Matching Supplies state and handlers (Golden Example + Dummies)
  const [matchingSupplies, setMatchingSupplies] = useState([
    {
      id: 'match-1',
      sppgName: 'Dapur SPPG Sleman',
      product: 'Telur Ayam',
      qtyNeeded: 200,
      pagu: 26000,
      deadline: 'Besok Pagi',
      supplier: 'Ibu Siti Rahma',
      phone: '0823-8899-1122',
      qtyOffered: 30,
      score: 92,
      nikStatus: 'Terverifikasi ✓',
      status: 'Menunggu'
    },
    {
      id: 'match-2',
      sppgName: 'Dapur SPPG Sleman',
      product: 'Beras Rojo Lele',
      qtyNeeded: 1000,
      pagu: 13500,
      deadline: '2 Hari Lagi',
      supplier: 'Pak Wayan Sudarma',
      phone: '0812-3456-7890',
      qtyOffered: 500,
      score: 95,
      nikStatus: 'Terverifikasi ✓',
      status: 'Menunggu'
    },
    {
      id: 'match-3',
      sppgName: 'Dapur SPPG Sleman',
      product: 'Cabai Merah Keriting',
      qtyNeeded: 150,
      pagu: 35000,
      deadline: 'Besok Pagi',
      supplier: 'Ibu Siti Aminah',
      phone: '0852-7711-2233',
      qtyOffered: 20,
      score: 88,
      nikStatus: 'Terverifikasi ✓',
      status: 'Menunggu'
    }
  ]);

  const [activeDemands, setActiveDemands] = useState<any[]>([
    {
      id: 1,
      urgency: 'Mendesak',
      deadline: 'Besok Pagi',
      product: 'Telur Ayam',
      volume: 200,
      pagu: 26000,
      satuan: 'kg'
    },
    {
      id: 2,
      urgency: 'Aktif',
      deadline: '2 Hari Lagi',
      product: 'Beras Rojo Lele',
      volume: 1000,
      pagu: 13500,
      satuan: 'kg'
    },
    {
      id: 3,
      urgency: 'Mendesak',
      deadline: 'Besok Pagi',
      product: 'Cabai Merah Keriting',
      volume: 150,
      pagu: 35000,
      satuan: 'kg'
    }
  ]);

  const handleApproveSupply = async (id: string) => {
    // Optimistic Update
    setMatchingSupplies(prev => prev.map(item => item.id === id ? { ...item, status: 'Disetujui' } : item));
    const supply = matchingSupplies.find(item => item.id === id);
    if (supply) {
      triggerNotification('success', `Suplai ${supply.qtyOffered} kg ${supply.product} oleh ${supply.supplier} berhasil disetujui, transaksi diteruskan ke sistem.`);
      setShipmentStatuses(prev => ({ ...prev, [id]: 'In Transit' }));
    }

    try {
      await fetch('/api/dashboard/kotak-kuning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_supply', id })
      });
      // Optionally refetch data to get true real-time updates from DB
      // fetchAllData(); 
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectSupply = async (id: string) => {
    setMatchingSupplies(prev => prev.map(item => item.id === id ? { ...item, status: 'Ditolak' } : item));
    triggerNotification('error', 'Rekomendasi suplai ditolak.');
    
    try {
      await fetch('/api/dashboard/kotak-kuning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_supply', id })
      });
      // fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dateQuery = globalDate ? `?date=${format(globalDate, 'yyyy-MM-dd')}` : '';
      const [membersRes, loansRes, commoditiesRes, matchingRes, kasRes, blastRes] = await Promise.all([
        fetch(`/api/anggota${dateQuery}`),
        fetch(`/api/dashboard/permodalan${dateQuery}`).catch(() => ({ ok: true, json: () => ({}) } as any)),
        fetch(`/api/dashboard/komoditas${dateQuery}`).catch(() => ({ ok: true, json: () => ({}) } as any)),
        fetch(`/api/dashboard/approvals${dateQuery}`).catch(() => ({ ok: true, json: () => ({}) } as any)),
        fetch(`/api/dashboard/kas${dateQuery}`).catch(() => ({ ok: true, json: () => ({}) } as any)),
        fetch(`/api/dashboard/blast-logs${dateQuery}`).catch(() => ({ ok: true, json: () => ({}) } as any))
      ]);

      if (!membersRes.ok) {
        throw new Error('Gagal memuat data dari server.');
      }

      const membersData = await membersRes.json().catch(() => ({}));
      const loansRaw = await loansRes.json().catch(() => ({}));
      const loansData = loansRaw.data || [];
      const commoditiesData = await commoditiesRes.json().catch(() => ({}));
      const matchingData = await matchingRes.json().catch(() => ({}));
      const kasRaw = await kasRes.json().catch(() => ({}));
      const kasData = kasRaw.data || [];
      const blastData = await blastRes.json().catch(() => ({}));

      try {
        const kkRes = await fetch(`/api/dashboard/kotak-kuning${dateQuery}`);
        if (kkRes.ok) {
          const kkData = await kkRes.json();
          if (kkData?.data?.activeDemands?.length > 0) {
            setActiveDemands(kkData.data.activeDemands);
          }
          if (kkData?.data?.matchingSupplies?.length > 0) {
            setMatchingSupplies(kkData.data.matchingSupplies);
          }
        }
      } catch (err) {
        console.log("Elysia Kotak Kuning failed, keeping mock data.");
      }

      const membersArray = Array.isArray(membersData?.data) ? membersData.data : (Array.isArray(membersData) ? membersData : []);
      const mappedMembers = membersArray.map((m: any) => ({
         id: m.id,
         name: m.nama,
         phone: m.noWhatsapp,
         role: m.kategoriUsaha || '-',
         joinDate: new Date(m.createdAt).toLocaleDateString('id-ID'),
         status: m.status === 'aktif' ? 'Aktif' : (m.status === 'suspend' ? 'Suspend' : 'Menunggu')
      }));
      setMembers(mappedMembers);

      setLoans(Array.isArray(loansData) ? loansData : []);

      setCommodities(commoditiesData?.prices || []);
      setPendingApprovals((matchingData?.approvals || []).filter((a: any) => a.status === 'Menunggu Pengurus'));
      
      setBukuKasData(Array.isArray(kasData) ? kasData : []);

      if (Array.isArray(blastData?.data)) {
        const mappedBlast = blastData.data.map((b: any, idx: number) => ({
          id: idx + 1,
          time: new Date(b.waktuKirim).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }).replace('.', ':'),
          name: b.namaPenerima || '-',
          phone: b.nomorWhatsapp || '-',
          text: b.isiTemplateChat || '-',
          status: b.statusBlast || 'Pending',
          isBlue: b.statusBlast === 'Dibaca / Dikirim'
        }));
        setBlastLogsData(mappedBlast);
      }

      try {
        const statsRes = await fetch(`/api/dashboard/stats${dateQuery}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData?.saldoKasKud) {
             setDashboardStats(statsData);
          }
        }
      } catch (err) {
        console.log("Stats fetch failed");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'log_ai_blast') {
      setIsLoadingBlast(true);
      const timer = setTimeout(() => setIsLoadingBlast(false), 800);
      return () => clearTimeout(timer);
    }
    if (activeTab !== 'permodalan') {
      setSelectedLoanId(null);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAllData();
  }, [globalDate]);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  // Handle member actions
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberPhone) {
      triggerNotification('error', 'Nama dan No Telepon wajib diisi!');
      return;
    }

    try {
      const url = editingMemberId ? `/api/anggota/${editingMemberId}` : '/api/anggota';
      const method = editingMemberId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idKoperasi: 1,
          nama: newMemberName,
          noWhatsapp: newMemberPhone,
          kategoriUsaha: newMemberRole,
          alamat: newMemberLocation,
          status: 'aktif'
        })
      });

      if (!res.ok) throw new Error(editingMemberId ? 'Gagal mengubah data anggota.' : 'Gagal menambahkan anggota.');

      const rawSaved = await res.json();
      const dbSaved = rawSaved.data ? rawSaved.data : rawSaved;
      
      const mappedSavedMember = {
         id: dbSaved.id,
         name: dbSaved.nama,
         phone: dbSaved.noWhatsapp,
         role: dbSaved.kategoriUsaha || '-',
         joinDate: new Date(dbSaved.createdAt || Date.now()).toLocaleDateString('id-ID'),
         status: dbSaved.status === 'aktif' ? 'Aktif' : (dbSaved.status === 'suspend' ? 'Suspend' : 'Menunggu'),
         location: dbSaved.alamat
      };
      
      if (editingMemberId) {
        setMembers(members.map(m => m.id === editingMemberId ? mappedSavedMember : m));
      } else {
        setMembers([mappedSavedMember, ...members]);
      }
      
      // Reset form
      setEditingMemberId(null);
      setNewMemberName('');
      setNewMemberPhone('');
      setNewMemberRole('Petani Padi');
      setNewMemberLocation('Desa Subur Makmur');
      setShowAddMember(false);
      triggerNotification('success', editingMemberId ? `Data ${mappedSavedMember.name} berhasil diubah!` : `Anggota ${mappedSavedMember.name} berhasil terdaftar!`);
    } catch (err: any) {
      triggerNotification('error', err.message || 'Gagal menyimpan anggota.');
    }
  };

  const handleUpdateMemberStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Aktif' ? 'suspend' : 'aktif';
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4444'}/anggota/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) throw new Error('Gagal memperbarui status.');

      const json = await res.json();
      const updatedData = json.data;
      const updatedMember = {
         id: updatedData.id,
         name: updatedData.nama,
         phone: updatedData.noWhatsapp,
         role: updatedData.kategoriUsaha || '-',
         joinDate: new Date(updatedData.createdAt).toLocaleDateString('id-ID'),
         status: updatedData.status === 'aktif' ? 'Aktif' : (updatedData.status === 'suspend' ? 'Suspend' : 'Menunggu')
      };
      
      setMembers(members.map(m => m.id === id ? updatedMember : m));
      triggerNotification('success', `Status anggota ${updatedMember.name} diubah menjadi ${updatedMember.status}.`);
    } catch (err: any) {
      triggerNotification('error', err.message);
    }
  };

  const handleApproveMember = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4444'}/anggota/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'aktif' })
      });

      if (!res.ok) throw new Error('Gagal memverifikasi anggota.');

      const json = await res.json();
      const updatedData = json.data;
      const updatedMember = {
         id: updatedData.id,
         name: updatedData.nama,
         phone: updatedData.noWhatsapp,
         role: updatedData.kategoriUsaha || '-',
         joinDate: new Date(updatedData.createdAt).toLocaleDateString('id-ID'),
         status: 'Aktif'
      };

      setMembers(members.map(m => m.id === id ? updatedMember : m));
      triggerNotification('success', `Pendaftaran anggota ${updatedMember.name} disetujui!`);
    } catch (err: any) {
      triggerNotification('error', err.message);
    }
  };

  // Handle loan actions
  const handleUpdateLoanStatus = async (id: string, newStatus: 'Disetujui' | 'Ditolak') => {
    try {
      if (newStatus === 'Disetujui') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4444'}/pinjaman/${id}/approve`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Gagal menyetujui pengajuan.');
        const json = await res.json();
        setLoans(loans.map(l => l.id === id ? { ...l, status: 'Disetujui' } : l));
        triggerNotification('success', `Pengajuan berhasil disetujui!`);
      } else {
        // Mock reject since we didn't add the endpoint
        setLoans(loans.map(l => l.id === id ? { ...l, status: 'Ditolak' } : l));
        triggerNotification('success', `Pengajuan ditolak!`);
      }
    } catch (err: any) {
      triggerNotification('error', err.message);
    }
  };

  // Handle matching approvals (Human-in-the-loop)
  const handleApproveMatching = async (id_approval: string) => {
    if (offlineSim) {
      // Offline mode: cache action in queue
      const updatedApprovals = pendingApprovals.filter(a => a.id_approval !== id_approval);
      setPendingApprovals(updatedApprovals);
      setSyncQueue(prev => [...prev, { action: 'approve', id_approval }]);
      triggerNotification('success', 'Persetujuan disimpan lokal di cache (Mode Offline).');
      return;
    }

    try {
      const res = await fetch('/api/dashboard/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          id_approval,
          manager_name: 'Bu Sari'
        })
      });

      if (!res.ok) throw new Error('Gagal menyetujui rekomendasi.');
      
      const data = await res.json();
      triggerNotification('success', data.message || 'Pencocokan disetujui, dana disalurkan!');
      fetchAllData();
    } catch (err: any) {
      triggerNotification('error', err.message);
    }
  };

  // Handle Offline Synchronization
  const handleSyncOfflineQueue = async () => {
    setIsSyncing(true);
    try {
      // Process queue sequentially
      for (const task of syncQueue) {
        if (task.action === 'approve') {
          await fetch('/api/matching', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'approve',
              id_approval: task.id_approval,
              manager_name: 'Bu Sari (Offline Sync)'
            })
          });
        }
      }
      setSyncQueue([]);
      triggerNotification('success', 'Seluruh data offline berhasil disinkronisasi ke SIMKOPDES!');
      await fetchAllData();
    } catch (err: any) {
      triggerNotification('error', 'Gagal sinkronisasi: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const calculateIRR = (cf: number, initial: number) => {
    if (cf * 5 <= initial) return 0;
    let low = 0;
    let high = 1.0;
    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      let pv = 0;
      for (let t = 1; t <= 5; t++) {
        pv += cf / Math.pow(1 + mid, t);
      }
      if (pv > initial) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return low * 100;
  };

  // Handle commodity price editing
  const handleEditCommodity = (item: CommodityPrice) => {
    setEditingCommodityId(item.id);
    setEditPriceValue(item.price);
    setEditInfoValue(item.info);
  };

  const handleSaveCommodityPrice = async (id: string) => {
    try {
      const res = await fetch('/api/commodity-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          price: editPriceValue,
          info: editInfoValue
        })
      });

      if (!res.ok) throw new Error('Gagal memperbarui harga komoditas.');

      const data = await res.json();
      if (data.success) {
        setCommodities(commodities.map(c => c.id === id ? data.updatedItem : c));
        setEditingCommodityId(null);
        triggerNotification('success', `Harga ${data.updatedItem.name} diperbarui menjadi Rp ${data.updatedItem.price.toLocaleString('id-ID')}/${data.updatedItem.unit}!`);
        if (onRefreshPublicPrices) onRefreshPublicPrices();
      }
    } catch (err: any) {
      triggerNotification('error', err.message);
    }
  };

  // Financial totals calculation
  const totalApprovedLoans = loans
    .filter(l => l.status === 'Disetujui')
    .reduce((sum, current) => sum + current.amount, 0);

  const pendingLoansCount = loans.filter(l => l.status === 'Menunggu').length;
  const pendingMembersCount = members.filter(m => m.status === 'Menunggu').length;
  const activeMembersCount = members.filter(m => m.status === 'Aktif').length;

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const membersPerPage = 10;
  const currentMembers = members.slice((membersPage - 1) * membersPerPage, membersPage * membersPerPage);
  const totalMembersPages = Math.ceil(members.length / membersPerPage);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans" id="admin-dashboard-container">

      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 p-5 z-20">
        <div className="space-y-6">
          {/* Logo Area */}
          <div className="flex items-center justify-center">
            <div className="flex items-center cursor-pointer" onClick={() => window.location.href = '/'}>
              <img src="/logo_text.png" alt="Logo Koperasi Renteng" className="h-8 object-contain" />
            </div>
          </div>

          {/* Unit Selector */}
          <div className="relative">
            <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Unit Wilayah</label>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer hover:bg-slate-100/70 transition-all">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#EAF4EE] text-[#0C683B] rounded-lg flex items-center justify-center font-bold text-xs">S</div>
                <span className="text-xs font-semibold text-slate-700">Sleman KUD</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Sidebar Menu Links */}
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[9px] uppercase font-bold tracking-[0.25em] text-slate-400 px-3 mb-2">General</p>
              
              <button
                onClick={() => handleTabClick('ringkasan')}
                className={`relative w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'ringkasan'
                    ? 'text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                }`}
              >
                {activeTab === 'ringkasan' && (
                  <motion.div layoutId="sidebar-active-bg" className="absolute inset-0 bg-[#0C683B] rounded-xl z-0" />
                )}
                <div className="flex items-center gap-2.5 relative z-10">
                  <Landmark className="w-4 h-4 shrink-0" />
                  <span>Dashboard</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('kotak_kuning')}
                className={`relative w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'kotak_kuning'
                    ? 'text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                }`}
              >
                {activeTab === 'kotak_kuning' && (
                  <motion.div layoutId="sidebar-active-bg" className="absolute inset-0 bg-[#0C683B] rounded-xl z-0" />
                )}
                <div className="flex items-center gap-2.5 relative z-10">
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span>Kotak Kuning</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('anggota')}
                className={`relative w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'anggota'
                    ? 'text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                }`}
              >
                {activeTab === 'anggota' && (
                  <motion.div layoutId="sidebar-active-bg" className="absolute inset-0 bg-[#0C683B] rounded-xl z-0" />
                )}
                <div className="flex items-center gap-2.5 relative z-10">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Anggota Desa</span>
                </div>
              </button>

              {/*
              <button
                onClick={() => handleTabClick('permodalan')}
                className={`relative w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'permodalan'
                    ? 'text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                }`}
              >
                {activeTab === 'permodalan' && (
                  <motion.div layoutId="sidebar-active-bg" className="absolute inset-0 bg-[#0C683B] rounded-xl z-0" />
                )}
                <div className="flex items-center gap-2.5 relative z-10">
                  <Coins className="w-4 h-4 shrink-0" />
                  <span>Permodalan</span>
                </div>
              </button>
              */}

              <button
                onClick={() => handleTabClick('komoditas')}
                className={`relative w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'komoditas'
                    ? 'text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                }`}
              >
                {activeTab === 'komoditas' && (
                  <motion.div layoutId="sidebar-active-bg" className="absolute inset-0 bg-[#0C683B] rounded-xl z-0" />
                )}
                <div className="flex items-center gap-2.5 relative z-10">
                  <Sprout className="w-4 h-4 shrink-0" />
                  <span>Harga Hasil Bumi</span>
                </div>
                <span className={`relative z-10 text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                  activeTab === 'komoditas' ? 'bg-white text-[#0C683B]' : 'bg-slate-100 text-slate-500'
                }`}>LIVE</span>
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] uppercase font-bold tracking-[0.25em] text-slate-400 px-3 mb-2">Tools</p>
              <button 
                onClick={() => handleTabClick('log_ai_blast')}
                className={`relative w-full flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
                  activeTab === 'log_ai_blast'
                    ? 'text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                }`}
              >
                {activeTab === 'log_ai_blast' && (
                  <motion.div layoutId="sidebar-active-bg" className="absolute inset-0 bg-[#0C683B] rounded-xl z-0" />
                )}
                <MessageSquare className="w-4 h-4 shrink-0 relative z-10" />
                <span className="relative z-10">Log AI Blast</span>
              </button>
              <button 
                onClick={() => handleTabClick('mitra_tani')}
                className={`relative w-full flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
                  activeTab === 'mitra_tani'
                    ? 'text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                }`}
              >
                {activeTab === 'mitra_tani' && (
                  <motion.div layoutId="sidebar-active-bg" className="absolute inset-0 bg-[#0C683B] rounded-xl z-0" />
                )}
                <Users className="w-4 h-4 shrink-0 relative z-10" />
                <span className="relative z-10">Mitra Tani</span>
              </button>
              <button 
                onClick={() => handleTabClick('kas_service_fee')}
                className={`relative w-full flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
                  activeTab === 'kas_service_fee'
                    ? 'text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                }`}
              >
                {activeTab === 'kas_service_fee' && (
                  <motion.div layoutId="sidebar-active-bg" className="absolute inset-0 bg-[#0C683B] rounded-xl z-0" />
                )}
                <Coins className="w-4 h-4 shrink-0 relative z-10" />
                <span className="relative z-10">Kas & Service Fee</span>
              </button>
            </div>

          </div>
        </div>

        {/* User profile details bottom as Dropdown Menu */}
        <div className="border-t border-slate-100 pt-4 mt-auto">
          <Menu>
            <MenuTrigger className="w-full outline-none">
              <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-left">
                <div className="w-9 h-9 rounded-full bg-[#EAF4EE] text-[#0C683B] flex items-center justify-center font-bold text-sm shrink-0">
                  BS
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-800 truncate">Bu Sari</span>
                  <span className="text-[10px] text-slate-400 truncate">sari@slemankud.id</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
              </div>
            </MenuTrigger>
            <MenuPanel className="w-56 mb-2 bg-white border border-slate-200 shadow-xl rounded-xl z-50" align="start" side="top" sideOffset={8}>
              <MenuGroup>
                <MenuGroupLabel>Akun Saya</MenuGroupLabel>
                <MenuSeparator />
                <MenuItem onClick={() => handleTabClick('pengaturan')}>
                  <Settings className="w-4 h-4 mr-2 text-slate-500" />
                  Pengaturan
                </MenuItem>
                <MenuItem>
                  <Bell className="w-4 h-4 mr-2 text-slate-500" />
                  Notifikasi
                </MenuItem>
                <MenuSeparator />
                <MenuItem variant="destructive" onClick={onBack}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Keluar Sesi
                </MenuItem>
              </MenuGroup>
            </MenuPanel>
          </Menu>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAF9]">
        {/* HEADER SECTION */}
        <header className="h-20 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>Pages</span>
            <ChevronRight className="w-3.5 h-3.5" />
             <span 
              className={`capitalize ${detailId ? 'text-slate-400 hover:text-slate-800 cursor-pointer transition-colors' : 'text-slate-800 font-bold'}`}
              onClick={() => { if (detailId) handleTabClick(activeTab) }}
             >
              {activeTab === 'ringkasan' ? 'Dashboard' : 
               activeTab === 'kotak_kuning' ? 'Kotak Kuning' : 
               activeTab === 'log_ai_blast' ? 'Log AI Blast' : 
               activeTab === 'mitra_tani' ? 'Mitra Tani' : 
               activeTab === 'kas_service_fee' ? 'Kas & Service Fee' : 
               activeTab === 'komoditas' ? 'Harga Bumi' : 
               activeTab === 'permodalan' ? (selectedLoanId ? 'Detail Permodalan' : 'Permodalan') : activeTab}
            </span>
            {detailId && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-800 font-bold">Detail</span>
              </>
            )}
          </div>

          {/* Search bar & utility icons */}
          <div className="flex items-center gap-6">
            <div className="relative w-64 z-50">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search items, members..."
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0C683B] focus:outline-none focus:bg-white transition-colors"
              />
              <AnimatePresence>
                {isSearchFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 w-[320px] bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden"
                  >
                    <div className="p-2">
                      <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hasil Pencarian Cepat</div>
                      
                      <div className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-3 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <Sprout className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">Beras Rojo Lele</p>
                          <p className="text-[10px] text-slate-400">Komoditas Tani</p>
                        </div>
                      </div>

                      <div className="p-2 mt-1 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-3 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">Pak Wayan Sudarma</p>
                          <p className="text-[10px] text-slate-400">Anggota KUD (Petani)</p>
                        </div>
                      </div>
                      
                      <div className="p-2 mt-1 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-3 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                          <Cpu className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">Parallel Orchestra AI</p>
                          <p className="text-[10px] text-slate-400">Pengaturan Sistem</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Tekan Enter untuk mencari</span>
                      <kbd className="text-[9px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">↵</kbd>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <DatePicker date={globalDate} setDate={setGlobalDate} />
            <button
              onClick={fetchAllData}
              disabled={isLoading}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 disabled:opacity-50 flex items-center justify-center cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <Menu>
              <MenuTrigger className="outline-none">
                <div className="relative cursor-pointer text-slate-500 hover:text-slate-800 p-1">
                  <Bell className="w-5 h-5" />
                  {pendingLoansCount > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </div>
              </MenuTrigger>
              <MenuPanel className="w-72 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-1" align="end" side="bottom" sideOffset={12}>
                <MenuGroup>
                  <MenuGroupLabel className="flex justify-between items-center text-xs">
                    <span>Notifikasi AI</span>
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-bold">3 Baru</span>
                  </MenuGroupLabel>
                  <MenuSeparator />
                  <div className="max-h-80 overflow-y-auto">
                    <MenuItem className="items-start gap-3 p-3">
                      <div className="w-8 h-8 rounded-[10px] bg-slate-100 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-800 leading-tight">Agent #1 (Pencatatan)</span>
                        <span className="text-[10px] text-slate-500 leading-snug whitespace-normal">Berhasil mencatat transaksi panen 50kg Jagung dari Pak Sukadi.</span>
                        <span className="text-[9px] text-slate-400 font-medium">2 menit lalu</span>
                      </div>
                    </MenuItem>
                    <MenuItem className="items-start gap-3 p-3">
                      <div className="w-8 h-8 rounded-[10px] bg-slate-100 flex items-center justify-center shrink-0">
                        <Coins className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-800 leading-tight">Agent #4 (Renteng)</span>
                        <span className="text-[10px] text-slate-500 leading-snug whitespace-normal">Tagihan renteng otomatis terkirim via WA ke 12 anggota.</span>
                        <span className="text-[9px] text-slate-400 font-medium">15 menit lalu</span>
                      </div>
                    </MenuItem>
                    <MenuItem className="items-start gap-3 p-3">
                      <div className="w-8 h-8 rounded-[10px] bg-slate-100 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-800 leading-tight">Agent #7 (Logistik)</span>
                        <span className="text-[10px] text-slate-500 leading-snug whitespace-normal">Peringatan: Stok beras Rojo Lele di gudang SPPG tersisa 150kg.</span>
                        <span className="text-[9px] text-slate-400 font-medium">1 jam lalu</span>
                      </div>
                    </MenuItem>
                  </div>
                </MenuGroup>
              </MenuPanel>
            </Menu>

            <Menu>
              <MenuTrigger className="outline-none">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-200 cursor-pointer shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop" 
                    alt="Bu Sari virtual profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </MenuTrigger>
              <MenuPanel className="w-48 bg-white border border-slate-200 shadow-xl rounded-xl z-50" align="end" side="bottom" sideOffset={12}>
                <MenuGroup>
                  <MenuGroupLabel>Profil Admin</MenuGroupLabel>
                  <MenuSeparator />
                  <MenuItem onClick={() => setActiveTab('pengaturan')}>
                    <Settings className="w-4 h-4 mr-2 text-slate-500" />
                    Pengaturan
                  </MenuItem>
                  <MenuItem>
                    <LogOut className="w-4 h-4 mr-2 text-slate-500" />
                    Keluar Sesi
                  </MenuItem>
                </MenuGroup>
              </MenuPanel>
            </Menu>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          {isLoading && !['kas_service_fee', 'mitra_tani', 'log_ai_blast', 'komoditas', 'permodalan', 'anggota'].includes(activeTab) ? (
            <div className="bg-white p-20 rounded-[10px] border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-10 h-10 text-[#0C683B] animate-spin" />
              <p className="text-sm italic text-slate-400">Mengambil data Koperasi secara aman...</p>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* TAB 1: DASHBOARD / RINGKASAN */}
              {activeTab === 'ringkasan' && (
                <div className="space-y-8">
                  <div className="bg-[#0C683B] text-white p-6 rounded-[10px] relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1 relative z-10">
                      <h3 className="font-sans text-xl md:text-2xl text-white font-extrabold tracking-tight leading-tight">
                        Hubungkan langsung hasil tani desa ke Dapur SPPG Sleman
                      </h3>
                      <p className="text-xs text-white/80 max-w-xl">
                        Gunakan fitur agregator otomatis untuk membagi kuota suplai pangan anggota secara adil.
                      </p>
                    </div>
                  </div>

                  {/* Offline Mode Alert banner */}
                  <div className="bg-white p-4 rounded-[10px] border border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      {offlineSim ? (
                        <WifiOff className="w-5 h-5 text-amber-500 animate-pulse" />
                      ) : (
                        <Wifi className="w-5 h-5 text-emerald-500" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Status Jaringan SIMKOPDES: {offlineSim ? 'OFFLINE (Simulasi Sinyal Lemah)' : 'ONLINE'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {syncQueue.length > 0 ? `${syncQueue.length} transaksi tertunda di cache lokal` : 'Seluruh data tersinkronisasi'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setOfflineSim(!offlineSim)}
                        className="flex items-center gap-2 px-4 py-2 text-[9px] uppercase font-bold tracking-wider rounded-[10px] border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer bg-white text-slate-600"
                      >
                        {offlineSim ? 'Hubungkan Jaringan' : 'Putus Sinyal Desa'}
                      </button>
                      {syncQueue.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSyncOfflineQueue}
                          disabled={isSyncing}
                          className="flex items-center gap-2 px-4 py-2 text-[9px] uppercase font-bold tracking-wider rounded-[10px] bg-[#0C683B] text-white hover:bg-[#074e2a] transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                          {isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi Sekarang'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Kotak Kuning Matching Approvals */}
                  {pendingApprovals.length > 0 && (
                    <div className="bg-amber-50 border-2 border-amber-400 p-6 rounded-3xl shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-250 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          </span>
                          <h3 className="font-serif italic text-lg font-bold text-amber-955">Kotak Kuning: Rekomendasi Distribusi Pangan SPPG</h3>
                        </div>
                        <span className="text-[9px] uppercase font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                          Human-in-the-Loop
                        </span>
                      </div>
                      <div className="space-y-4">
                        {pendingApprovals.map((appr) => (
                          <div key={appr.id_approval} className="p-4 rounded-2xl bg-white border border-amber-200 space-y-3">
                            <div className="flex justify-between items-start text-xs">
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm">Distribusi Order SPPG</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">{appr.details}</p>
                              </div>
                              <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-xl text-[10px]">
                                Tengah Dicocokkan AI
                              </span>
                            </div>
                            <div className="border-t border-amber-100 pt-3">
                              <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Rekomendasi Pemecahan Kontrak Supplier:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {appr.allocations.map((alloc: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 text-xs">
                                    <span className="font-medium text-slate-700">{alloc.nama}</span>
                                    <span className="font-bold text-[#0C683B] bg-white px-2 py-0.5 rounded border border-amber-100">
                                      {alloc.amount} kg
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-end gap-3 border-t border-amber-100 pt-3">
                              <button
                                type="button"
                                onClick={() => handleApproveMatching(appr.id_approval)}
                                className="px-5 py-2.5 bg-[#0C683B] hover:bg-[#074e2a] text-white text-[10px] uppercase tracking-wider font-bold rounded-xl shadow cursor-pointer transition-colors"
                              >
                                ✓ Setujui Distribusi & Salurkan Dana
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overview Grid (5 KPI Cards) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Revenue Card */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-36">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Saldo Kas KUD</span>
                        <div className="w-8 h-8 rounded-full bg-[#EAF4EE] text-[#0C683B] flex items-center justify-center">
                          <Landmark className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-800 font-mono">{formatRupiah(dashboardStats.saldoKasKud.value)}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                          <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md mr-1 font-bold">+{dashboardStats.saldoKasKud.percentage}%</span>
                        </p>
                      </div>
                    </div>

                    {/* Total Sales -> Anggota */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-36">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Total Anggota</span>
                        <div className="w-8 h-8 rounded-full bg-[#EAF4EE] text-[#0C683B] flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800 font-mono">{members.length}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                          <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md mr-1 font-bold">+{dashboardStats.totalAnggota.percentage}%</span>
                        </p>
                      </div>
                    </div>

                    {/* Total Orders -> Modal Disalurkan */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-36">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Modal Disalurkan</span>
                        <div className="w-8 h-8 rounded-full bg-[#EAF4EE] text-[#0C683B] flex items-center justify-center">
                          <Coins className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-800 font-mono">{formatRupiah(dashboardStats.modalDisalurkan.value)}</p>
                        <p className="text-[10px] text-[#0C683B] font-semibold mt-1">
                          <span className="bg-[#EAF4EE] text-[#0C683B] px-1.5 py-0.5 rounded-md mr-1 font-bold">+{dashboardStats.modalDisalurkan.percentage}%</span>
                        </p>
                      </div>
                    </div>

                    {/* Profit -> SHU Koperasi */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-36">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">SHU Koperasi</span>
                        <div className="w-8 h-8 rounded-full bg-[#EAF4EE] text-[#0C683B] flex items-center justify-center">
                          <BadgePercent className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-800 font-mono">{formatRupiah(dashboardStats.shuKoperasi.value)}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                          <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md mr-1 font-bold">+{dashboardStats.shuKoperasi.percentage}%</span>
                        </p>
                      </div>
                    </div>

                    {/* Service Fee Card */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-36">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#0C683B]">Service Fee (2%)</span>
                        <div className="w-8 h-8 rounded-full bg-[#EAF4EE] text-[#0C683B] flex items-center justify-center">
                          <Coins className="w-4 h-4 animate-spin-slow" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-[#0C683B] font-mono">{formatRupiah(dashboardStats.serviceFee.value)}</p>
                        <p className="text-[10px] text-[#0C683B] font-semibold mt-1">
                          <span className="bg-[#EAF4EE] text-[#0C683B] px-1.5 py-0.5 rounded-md mr-1 font-bold">+{dashboardStats.serviceFee.percentage}%</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Charts row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Volume Transaksi (Bar Chart) */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Volume Transaksi Tani</span>
                          <h4 className="text-xl font-bold text-slate-800">1,525 kg <span className="text-xs text-emerald-600 font-semibold">+20.1%</span></h4>
                        </div>
                        <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded-lg font-bold">30 Hari Terakhir</span>
                      </div>
                      
                      <div className="h-44 flex items-end justify-between gap-1.5 pt-6 border-b border-slate-100">
                        {[40, 90, 85, 140, 20, 110, 120, 145, 10, 80, 50, 150].map((h, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2 group justify-end">
                            <div className="w-full bg-[#EAF4EE] rounded-t-lg relative h-28 flex items-end">
                              <div 
                                style={{ height: `${(h / 150) * 100}%` }} 
                                className="w-full bg-[#0C683B] rounded-t-lg group-hover:bg-[#074e2a] transition-all relative"
                              >
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap transition-opacity pointer-events-none font-mono z-10">
                                  {Math.round(h * 10)} kg
                                </div>
                              </div>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono mt-1 text-center leading-tight">0{i+1}<br/>Jul</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Velocity of Money (Line Chart) */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Perputaran Uang Lokal</span>
                          <h4 className="text-xl font-bold text-slate-800">Rp 20.462.890 <span className="text-xs text-emerald-600 font-semibold">+20.1%</span></h4>
                        </div>
                        <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded-lg font-bold">Velocity of Money</span>
                      </div>
                      
                      <div className="h-44 w-full relative pt-6">
                        <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0C683B" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#0C683B" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
                          <line x1="0" y1="50" x2="300" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
                          <line x1="0" y1="80" x2="300" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
                          <path d="M 0 60 Q 30 90 60 70 T 120 50 T 180 30 T 240 80 T 300 30 L 300 100 L 0 100 Z" fill="url(#chart-grad)" />
                          <path d="M 0 60 Q 30 90 60 70 T 120 50 T 180 30 T 240 80 T 300 30" fill="none" stroke="#0C683B" strokeWidth="3" strokeLinecap="round" />
                          <circle cx="60" cy="70" r="4" fill="#0C683B" stroke="#FFFFFF" strokeWidth="1.5" />
                          <circle cx="120" cy="50" r="4" fill="#0C683B" stroke="#FFFFFF" strokeWidth="1.5" />
                          <circle cx="180" cy="30" r="4" fill="#0C683B" stroke="#FFFFFF" strokeWidth="1.5" />
                          <circle cx="240" cy="80" r="4" fill="#0C683B" stroke="#FFFFFF" strokeWidth="1.5" />
                          <circle cx="300" cy="30" r="4" fill="#0C683B" stroke="#FFFFFF" strokeWidth="1.5" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Table & Sensitivity calculator */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    {/* Bottom Table: Recent Loan Requests */}
                    <div className="xl:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 pb-3 gap-3">
                        <h3 className="font-serif italic text-base font-bold text-slate-800">Antrean Transaksi & Permodalan Baru</h3>
                        <div className="flex flex-wrap gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl text-[10px] font-bold">
                          <button className="px-2.5 py-1.5 rounded-lg bg-white text-[#0C683B] shadow-sm">Semua</button>
                          <button onClick={() => setActiveTab('permodalan')} className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800">Yarnen</button>
                          <button onClick={() => setActiveTab('permodalan')} className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800">UMKM</button>
                          <button onClick={() => setActiveTab('permodalan')} className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800">Persetujuan</button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-3 px-2">Nama Pemohon</th>
                              <th className="py-3 px-2">Skema</th>
                              <th className="py-3 px-2">Besar Permodalan</th>
                              <th className="py-3 px-2">Tujuan</th>
                              <th className="py-3 px-2 text-center">Status</th>
                              <th className="py-3 px-2 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {loans.slice(0, 4).map((loan) => (
                              <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-2">
                                  <span className="font-semibold text-slate-800 text-xs block">{loan.name}</span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{loan.phone}</span>
                                </td>
                                <td className="py-4 px-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    loan.type === 'yarnen' 
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}>
                                    {loan.type === 'yarnen' ? 'Yarnen' : 'UMKM'}
                                  </span>
                                </td>
                                <td className="py-4 px-2 font-mono font-bold text-slate-800">{formatRupiah(loan.amount)}</td>
                                <td className="py-4 px-2 text-slate-500 max-w-[150px] truncate" title={loan.purpose}>{loan.purpose}</td>
                                <td className="py-4 px-2 text-center">
                                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase ${
                                    loan.status === 'Disetujui' 
                                      ? 'bg-[#EAF4EE] text-[#0C683B] border border-emerald-200/50' 
                                      : loan.status === 'Ditolak' 
                                      ? 'bg-red-50 text-red-600 border border-red-200/50' 
                                      : 'bg-amber-50 text-amber-600 border border-amber-200/50 animate-pulse'
                                  }`}>
                                    {loan.status === 'Disetujui' ? 'Selesai' : loan.status === 'Ditolak' ? 'Batal' : 'Proses'}
                                  </span>
                                </td>
                                <td className="py-4 px-2 text-right">
                                  {loan.status === 'Menunggu' ? (
                                    <div className="flex gap-1.5 justify-end">
                                      <button
                                        onClick={() => handleUpdateLoanStatus(loan.id, 'Disetujui')}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded-lg cursor-pointer"
                                        title="Setujui"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleUpdateLoanStatus(loan.id, 'Ditolak')}
                                        className="bg-red-600 hover:bg-red-700 text-white p-1 rounded-lg cursor-pointer"
                                        title="Tolak"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">Tuntas</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right: Sensitivity Calculator */}
                    <div className="xl:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                      <div className="border-b border-slate-100 pb-3">
                        <h3 className="font-serif italic text-base font-bold text-slate-805">Sensitivitas Finansial RMU</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Simulasikan dampak iklim dan NPL terhadap kelayakan investasi Koperasi</p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-600">Gagal Panen (Iklim)</span>
                            <span className="font-mono font-bold text-red-650">-{gagalPanenShock}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="85"
                            value={gagalPanenShock}
                            onChange={(e) => setGagalPanenShock(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-600"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-600">Lonjakan HPP (Inflasi)</span>
                            <span className="font-mono font-bold text-amber-600">+{hppShock}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="80"
                            value={hppShock}
                            onChange={(e) => setHppShock(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-650"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-600">Kredit Macet (NPL)</span>
                            <span className="font-mono font-bold text-red-750">+{nplShock}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="30"
                            value={nplShock}
                            onChange={(e) => setNplShock(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-700"
                          />
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                          {(() => {
                            const cf0 = 30000000;
                            const cf = cf0 * (1 - gagalPanenShock/100) * (1 - nplShock/100) * (1 - hppShock/100);
                            
                            // NPV
                            let pv = 0;
                            for (let t = 1; t <= 5; t++) {
                              pv += cf / Math.pow(1.1, t);
                            }
                            const npv = pv - 100000000;
                            const ebcr = pv / 100000000;
                            const irr = calculateIRR(cf, 100000000);
                            const isFeasible = npv > 0 && ebcr > 1;

                            return (
                              <div className="space-y-3.5 text-xs">
                                <div className="flex justify-between border-b border-slate-200/40 pb-2">
                                  <span className="text-slate-500">NPV Proyek:</span>
                                  <span className={`font-mono font-bold ${npv >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatRupiah(npv)}
                                  </span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200/40 pb-2">
                                  <span className="text-slate-500">IRR:</span>
                                  <span className={`font-mono font-bold ${irr >= 10 ? 'text-emerald-600' : 'text-red-650'}`}>
                                    {irr.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200/40 pb-2">
                                  <span className="text-slate-500">BC Ratio:</span>
                                  <span className={`font-mono font-bold ${ebcr >= 1 ? 'text-emerald-650' : 'text-red-650'}`}>
                                    {ebcr.toFixed(2)}
                                  </span>
                                </div>
                                <div className={`p-2.5 rounded-xl text-center font-bold uppercase text-[9px] border ${
                                  isFeasible 
                                    ? 'bg-[#EAF4EE] border-[#EAF4EE] text-[#0C683B]' 
                                    : 'bg-red-50 border-red-200 text-red-750 animate-pulse'
                                }`}>
                                  {isFeasible ? '✓ INVESTASI LAYAK' : '⚠ TIDAK LAYAK (NPV < 0)'}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: KOTAK KUNING (MATCHING SPPG) */}
              {activeTab === 'kotak_kuning' && (
                <div className="space-y-8">
                  {/* Active Demands */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-sans text-2xl font-extrabold text-slate-800 tracking-tight">Kebutuhan Pangan Aktif Dapur SPPG Sleman</h3>
                      <p className="text-xs text-slate-400 mt-1">Daftar permintaan pangan yang harus dipenuhi KUD untuk program Makan Bergizi Gratis</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {activeDemands.map((demand) => (
                        <div key={demand.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                          <div className="flex justify-between items-start">
                            <span className={`font-bold px-2 py-0.5 rounded text-[9px] uppercase border ${
                              demand.urgency === 'Mendesak' 
                                ? 'bg-amber-100 text-amber-800 border-amber-200/50' 
                                : 'bg-slate-100 text-slate-650 border-slate-200'
                            }`}>
                              {demand.urgency}
                            </span>
                            <span className="text-[10px] text-slate-450 font-mono">Deadline: {demand.deadline}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-base">{demand.product}</h4>
                            <p className="text-xs text-slate-500 mt-1">
                              Volume Dibutuhkan: <span className="font-bold text-slate-800">{demand.volume} {demand.satuan}</span>
                            </p>
                          </div>
                          <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-3">
                            <span className="text-slate-400">Pagu Koperasi:</span>
                            <span className="font-bold text-[#0C683B]">Rp {demand.pagu.toLocaleString('id-ID')}/{demand.satuan}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation table */}
                  <div className="space-y-6 mt-8">
                    <div>
                      <h3 className="font-sans text-xl text-slate-800 font-extrabold tracking-tight">Rekomendasi Matching Tani</h3>
                      <p className="text-xs text-slate-400 mt-1">Alokasi suplai otomatis berdasarkan kriteria sistem.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                            <th className="py-3 px-2">Mitra Tani Supplier</th>
                            <th className="py-3 px-2">Komoditas Tani</th>
                            <th className="py-3 px-2">Kesanggupan Suplai</th>
                            <th className="py-3 px-2">Kecocokan</th>
                            <th className="py-3 px-2">Verifikasi NIK</th>
                            <th className="py-3 px-2">Service Fee (2%)</th>
                            <th className="py-3 px-2 text-center">Status</th>
                            <th className="py-3 px-2 text-right">Aksi Persetujuan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {matchingSupplies.map(item => {
                            const transactionValue = item.qtyOffered * item.pagu;
                            const serviceFee = transactionValue * 0.02;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-2">
                                  <p className="font-bold text-slate-800 text-xs">{item.supplier}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{item.phone}</p>
                                </td>
                                <td className="py-4 px-2 font-semibold text-slate-700">{item.product}</td>
                                <td className="py-4 px-2 font-mono font-bold text-slate-850">{item.qtyOffered} kg</td>
                                <td className="py-4 px-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-[#0C683B]">{item.score}%</span>
                                    <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                      <div className="h-full bg-[#0C683B]" style={{ width: `${item.score}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-2 font-semibold text-emerald-650">{item.nikStatus}</td>
                                <td className="py-4 px-2 font-mono text-slate-500">Rp {serviceFee.toLocaleString('id-ID')}</td>
                                <td className="py-4 px-2 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    item.status === 'Disetujui' 
                                      ? 'bg-[#EAF4EE] text-[#0C683B] border border-emerald-100'
                                      : item.status === 'Ditolak'
                                      ? 'bg-red-50 text-red-750 border border-red-100'
                                      : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-4 px-2 text-right">
                                  {item.status === 'Menunggu' ? (
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => handleApproveSupply(item.id)}
                                        className="bg-[#0C683B] hover:bg-[#074e2a] text-white px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
                                      >
                                        Setujui Suplai
                                      </button>
                                      <button
                                        onClick={() => handleRejectSupply(item.id)}
                                        className="border border-slate-200 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
                                      >
                                        Tolak
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">Tuntas</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: LOG AI BLAST */}
              {activeTab === 'log_ai_blast' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2">
                    <div>
                      <h3 className="font-sans text-2xl font-extrabold text-slate-800 tracking-tight">Log AI Proactive Blast</h3>
                      <p className="text-xs text-slate-400 mt-1">Riwayat pengiriman pesan penawaran otomatis ke WhatsApp petani terdaftar</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-white border border-slate-200 shadow-sm rounded-[10px] flex flex-col">
                    <Table>
                      <TableHeader className="bg-[#f8faf9] sticky top-0 z-10">
                        <TableRow className="border-b border-slate-200 hover:bg-[#f8faf9]">
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu Kirim</TableHead>
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Penerima</TableHead>
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nomor WhatsApp</TableHead>
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Isi Template Chat</TableHead>
                          <TableHead className="py-4 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status Blast</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                            {isLoadingBlast ? (
                              Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skel-${i}`} className="border-b border-slate-100">
                                  <TableCell className="py-4 px-5"><Skeleton className="h-4 w-28 bg-slate-200" /></TableCell>
                                  <TableCell className="py-4 px-5"><Skeleton className="h-5 w-36 bg-slate-200" /></TableCell>
                                  <TableCell className="py-4 px-5"><Skeleton className="h-4 w-24 bg-slate-200" /></TableCell>
                                  <TableCell className="py-4 px-5"><Skeleton className="h-4 w-72 bg-slate-200" /></TableCell>
                                  <TableCell className="py-4 px-5 text-center"><Skeleton className="h-6 w-24 bg-slate-200 mx-auto rounded-[10px]" /></TableCell>
                                </TableRow>
                              ))
                            ) : (
                              blastLogsData.slice((logBlastPage - 1) * itemsPerPage, logBlastPage * itemsPerPage).map((log) => (
                                <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                  <TableCell className="py-4 px-5 font-mono text-xs text-slate-500">{log.time}</TableCell>
                                  <TableCell className="py-4 px-5 font-bold text-sm text-slate-800">{log.name}</TableCell>
                                  <TableCell className="py-4 px-5 font-mono text-xs text-slate-500">{log.phone}</TableCell>
                                  <TableCell className="py-4 px-5 text-xs text-slate-600 max-w-xs truncate" title={log.text}>
                                    {log.text.length > 90 ? log.text.substring(0, 90) + '...' : log.text}
                                  </TableCell>
                                  <TableCell className="py-4 px-5 text-center">
                                    <span className={`inline-block px-2.5 py-1 rounded-[10px] text-[9px] font-bold uppercase border ${
                                      log.isBlue 
                                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                        : 'bg-[#EAF4EE] text-[#0C683B] border-emerald-200/50'
                                    }`}>
                                      {log.status}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                                      {/* Pagination Controls */}
                      {blastLogsData.length > 0 && (
                        <div className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs font-medium text-slate-500">
                              Menampilkan <span className="font-bold text-slate-800">{(logBlastPage - 1) * itemsPerPage + 1}-{Math.min(logBlastPage * itemsPerPage, blastLogsData.length)}</span> dari <span className="font-bold text-slate-800">{blastLogsData.length}</span> data
                            </div>
                            
                            {blastLogsData.length > itemsPerPage && (
                              <div className="flex-shrink-0">
                                <Pagination className="mx-0 w-auto justify-end">
                                  <PaginationContent>
                                    <PaginationItem>
                                      <PaginationPrevious 
                                        href="#" 
                                        onClick={(e) => { e.preventDefault(); setLogBlastPage(p => Math.max(1, p - 1)); }}
                                        className={logBlastPage === 1 ? "pointer-events-none opacity-50 bg-transparent border-transparent" : "cursor-pointer bg-white"}
                                      />
                                    </PaginationItem>
                                    {Array.from({ length: Math.ceil(blastLogsData.length / itemsPerPage) }).map((_, i) => (
                                      <PaginationItem key={i}>
                                        <PaginationLink 
                                          href="#" 
                                          isActive={logBlastPage === i + 1}
                                          onClick={(e) => { e.preventDefault(); setLogBlastPage(i + 1); }}
                                          className={logBlastPage === i + 1 ? "bg-[#0C683B] text-white hover:bg-[#0C683B]/90 border-transparent shadow-md" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}
                                        >
                                          {i + 1}
                                        </PaginationLink>
                                      </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                      <PaginationNext 
                                        href="#" 
                                        onClick={(e) => { e.preventDefault(); setLogBlastPage(p => Math.min(Math.ceil(blastLogsData.length / itemsPerPage), p + 1)); }}
                                        className={logBlastPage === Math.ceil(blastLogsData.length / itemsPerPage) ? "pointer-events-none opacity-50 bg-transparent border-transparent" : "cursor-pointer bg-white"}
                                      />
                                    </PaginationItem>
                                  </PaginationContent>
                                </Pagination>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
              )}            

              {/* TAB: MITRA TANI */}
              {activeTab === 'mitra_tani' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2">
                    <div>
                      <h3 className="font-sans text-2xl font-extrabold text-slate-800 tracking-tight">Database Mitra Tani Sleman</h3>
                      <p className="text-xs text-slate-400 mt-1">Daftar petani supplier terdaftar untuk program Rantai Pasok SPPG Nasional</p>
                    </div>
                    <div className="bg-[#EAF4EE] text-[#0C683B] px-4 py-2 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-2">
                      Total Terverifikasi: {isLoading ? <Skeleton className="h-4 w-6 bg-emerald-200/60" /> : members.length} Mitra Utama
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-white border border-slate-200 shadow-sm rounded-[10px]">
                    <Table>
                      <TableHeader className="bg-[#f8faf9] sticky top-0 z-10">
                        <TableRow className="border-b border-slate-200 hover:bg-[#f8faf9]">
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mitra Tani</TableHead>
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Komoditas</TableHead>
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kontak</TableHead>
                          <TableHead className="py-4 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status Verifikasi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i} className="border-b border-slate-100">
                              <TableCell className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  <Skeleton className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                                  <div className="space-y-2">
                                    <Skeleton className="h-4 w-32 bg-slate-200" />
                                    <Skeleton className="h-3 w-24 bg-slate-100" />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-5">
                                <Skeleton className="h-6 w-24 bg-emerald-100 rounded-md" />
                              </TableCell>
                              <TableCell className="py-4 px-5">
                                <Skeleton className="h-4 w-28 bg-slate-200" />
                              </TableCell>
                              <TableCell className="py-4 px-5">
                                <div className="flex justify-center">
                                  <Skeleton className="h-6 w-24 bg-slate-200 rounded-full" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : members.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">Belum ada mitra tani yang terdaftar.</TableCell>
                          </TableRow>
                        ) : (
                          members.slice((mitraTaniPage - 1) * itemsPerPage, mitraTaniPage * itemsPerPage).map((member) => (
                            <TableRow key={member.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <TableCell className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-[#EAF4EE] text-[#0C683B] flex items-center justify-center font-bold text-xs shrink-0">
                                    {member.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm text-slate-800">{member.name}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Bergabung: {member.joinDate}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-5">
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md font-bold border border-emerald-100">
                                  {member.role}
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{member.phone}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-5 text-center">
                                {member.status === 'Aktif' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                    <Check className="w-3 h-3" /> Terverifikasi
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                                    <AlertCircle className="w-3 h-3" /> Menunggu
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {members.length > 0 && (
                    <div className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs font-medium text-slate-500">
                        Menampilkan <span className="font-bold text-slate-800">{(mitraTaniPage - 1) * itemsPerPage + 1}-{Math.min(mitraTaniPage * itemsPerPage, members.length)}</span> dari <span className="font-bold text-slate-800">{members.length}</span> data
                      </div>
                      
                      {members.length > itemsPerPage && (
                        <div className="flex-shrink-0">
                          <Pagination className="mx-0 w-auto justify-end">
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious 
                                  href="#" 
                                  onClick={(e) => { e.preventDefault(); setMitraTaniPage(p => Math.max(1, p - 1)); }}
                                  className={mitraTaniPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer bg-white border border-slate-200"}
                                />
                              </PaginationItem>
                              {Array.from({ length: Math.ceil(members.length / itemsPerPage) }).map((_, i) => (
                                <PaginationItem key={i}>
                                  <PaginationLink 
                                    href="#" 
                                    isActive={mitraTaniPage === i + 1}
                                    onClick={(e) => { e.preventDefault(); setMitraTaniPage(i + 1); }}
                                    className={mitraTaniPage === i + 1 ? "bg-[#0C683B] text-white hover:bg-[#0C683B]/90 border-transparent shadow-md" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}
                                  >
                                    {i + 1}
                                  </PaginationLink>
                                </PaginationItem>
                              ))}
                              <PaginationItem>
                                <PaginationNext 
                                  href="#" 
                                  onClick={(e) => { e.preventDefault(); setMitraTaniPage(p => Math.min(Math.ceil(members.length / itemsPerPage), p + 1)); }}
                                  className={mitraTaniPage === Math.ceil(members.length / itemsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer bg-white border border-slate-200"}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: KAS & SERVICE FEE */}
              {activeTab === 'kas_service_fee' && (
                detailId ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <h3 className="font-sans text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                          Detail Transaksi 
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md text-sm font-mono">{detailId}</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Rincian mutasi kas dan service fee koperasi</p>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                      {isLoading ? (
                        <div className="space-y-6 animate-pulse">
                          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                          <div className="h-10 bg-slate-200 rounded w-1/2"></div>
                          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
                            <RefreshCw className="w-8 h-8 text-emerald-600" />
                          </div>
                          <h4 className="text-xl font-bold text-slate-800">Transaksi {detailId}</h4>
                          <p className="text-slate-500 max-w-md text-center text-sm">
                            Menampilkan data riwayat transaksi tercatat. Informasi lengkap seperti pihak pengirim, penerima, dan catatan tambahan bisa diakses di dashboard admin level 2.
                          </p>
                          <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-lg">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                              <p className="text-xs text-slate-400 font-bold uppercase">Status</p>
                              <p className="font-bold text-emerald-600 mt-1">BERHASIL</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                              <p className="text-xs text-slate-400 font-bold uppercase">Sistem</p>
                              <p className="font-bold text-slate-700 mt-1">SIMKOPDES Sinkron</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                <div className="space-y-8">
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Saldo Kas Koperasi */}
                    <div className="bg-[#0C683B] p-6 rounded-[10px] relative overflow-hidden flex flex-col justify-between shadow-md">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-100">Saldo Kas KUD</span>
                        {isLoading ? (
                          <Skeleton className="h-9 w-48 mt-1 bg-white/40" />
                        ) : (
                          <p className="text-3xl font-extrabold text-white font-mono mt-1">
                            Rp {bukuKasData.length > 0 ? Number(bukuKasData[0].saldoSetelahnya).toLocaleString('id-ID') : '0'}
                          </p>
                        )}
                        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-200">
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>SIMKOPDES Sinkron</span>
                        </div>
                      </div>
                      <Wallet className="absolute -bottom-6 -right-4 w-32 h-32 text-white opacity-10 pointer-events-none" />
                    </div>

                    {/* Total Transaksi SPPG */}
                    <div className="bg-slate-900 p-6 rounded-[10px] relative overflow-hidden flex flex-col justify-between shadow-md">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Total Transaksi Rantai Pasok</span>
                        {isLoading ? (
                          <Skeleton className="h-8 w-40 mt-1 bg-white/30" />
                        ) : (
                          <div className="mt-1 flex items-end gap-3">
                            <p className="text-2xl font-bold text-white font-mono">
                              Rp {Math.round(bukuKasData.filter((k: any) => k.uraian.includes('SPPG')).reduce((acc: number, cur: any) => acc + Number(cur.nominal) / 0.02, 0)).toLocaleString('id-ID')}
                            </p>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 mt-2 font-semibold">Bulan Juli 2026</p>
                      </div>
                      <TrendingUp className="absolute -bottom-6 -right-4 w-32 h-32 text-white opacity-5 pointer-events-none" />
                    </div>

                    {/* Total Service Fee */}
                    <div className="bg-amber-400 p-6 rounded-[10px] relative overflow-hidden flex flex-col justify-between shadow-md">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-amber-900">Service Fee Terkumpul (2%)</span>
                        {isLoading ? (
                          <Skeleton className="h-8 w-40 mt-1 bg-amber-900/30" />
                        ) : (
                          <div className="mt-1">
                            <p className="text-2xl font-bold text-amber-950 font-mono">
                              Rp {Math.round(bukuKasData.filter((k: any) => k.uraian.includes('Service Fee') && k.tipeMutasi === 'masuk').reduce((acc: number, cur: any) => acc + Number(cur.nominal), 0)).toLocaleString('id-ID')}
                            </p>
                            <p className="text-[10px] text-amber-900 font-semibold mt-1">Masuk Kas Koperasi</p>
                          </div>
                        )}
                      </div>
                      <Coins className="absolute -bottom-6 -right-4 w-32 h-32 text-amber-900 opacity-10 pointer-events-none" />
                    </div>
                  </div>

                  {/* Ledger/Buku Kas */}
                  <div className="space-y-6 pt-4">
                    <div>
                      <h3 className="font-sans text-2xl font-extrabold text-slate-800 tracking-tight">Buku Kas & Transaksi Service Fee Koperasi</h3>
                      <p className="text-xs text-slate-400 mt-1">Buku kas penerimaan hasil potongan operasional 2% transaksi SPPG dan dana modal.</p>
                    </div>

                    <div className="border border-slate-200/60 rounded-[10px] overflow-hidden bg-white shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="hover:bg-transparent border-b-slate-200/60">
                            <TableHead className="font-semibold text-slate-500">Tanggal</TableHead>
                            <TableHead className="font-semibold text-slate-500">Uraian / Deskripsi</TableHead>
                            <TableHead className="font-semibold text-slate-500">Transaksi Referensi</TableHead>
                            <TableHead className="font-semibold text-slate-500">Mutasi Masuk (Kredit)</TableHead>
                            <TableHead className="font-semibold text-slate-500 text-right">Saldo Kas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-24 bg-slate-200" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-48 bg-slate-200" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16 bg-slate-200" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24 bg-slate-200" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto bg-slate-200" /></TableCell>
                              </TableRow>
                            ))
                          ) : bukuKasData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-slate-500 font-medium">
                                Belum ada transaksi kas
                              </TableCell>
                            </TableRow>
                          ) : (
                            bukuKasData.slice((kasCurrentPage - 1) * kasItemsPerPage, kasCurrentPage * kasItemsPerPage).map((kas: any, idx: number) => {
                              const date = new Date(kas.tanggal);
                              const formattedDate = `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleString('id-ID', { month: 'short' })} ${date.getFullYear()}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                              const isMasuk = kas.tipeMutasi === 'masuk';
                              
                              return (
                                <TableRow 
                                  key={idx} 
                                  className="group hover:bg-slate-50 transition-colors border-b-slate-100/50 cursor-pointer"
                                  onClick={() => window.location.href = `/kas-service-fee/${kas.transaksiRef || idx}`}
                                >
                                  <TableCell className="font-mono text-xs text-slate-500">{formattedDate}</TableCell>
                                  <TableCell className="font-medium text-slate-800">{kas.uraian}</TableCell>
                                  <TableCell className="font-mono text-xs text-slate-500 group-hover:text-[#0C683B] group-hover:underline transition-colors">{kas.transaksiRef || '-'}</TableCell>
                                  <TableCell className={`font-mono text-xs font-bold ${isMasuk ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {isMasuk ? '+' : '-'}Rp {Number(kas.nominal).toLocaleString('id-ID')}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs font-bold text-slate-800 text-right">
                                    Rp {Number(kas.saldoSetelahnya).toLocaleString('id-ID')}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls */}
                    {bukuKasData.length > kasItemsPerPage && (
                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-4 mt-2">
                        <p className="text-xs text-slate-500">
                          Menampilkan <span className="font-bold text-slate-800">{Math.min((kasCurrentPage - 1) * kasItemsPerPage + 1, bukuKasData.length)}</span> - <span className="font-bold text-slate-800">{Math.min(kasCurrentPage * kasItemsPerPage, bukuKasData.length)}</span> dari <span className="font-bold text-slate-800">{bukuKasData.length}</span> transaksi
                        </p>
                        <Pagination className="justify-end w-auto mx-0">
                          <PaginationContent className="gap-2">
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setKasCurrentPage(p => Math.max(1, p - 1))}
                                className={`cursor-pointer ${kasCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'hover:bg-slate-50'}`}
                              />
                            </PaginationItem>
                            {Array.from({ length: Math.ceil(bukuKasData.length / kasItemsPerPage) }).map((_, i) => (
                              <PaginationItem key={i}>
                                <PaginationLink 
                                  onClick={() => setKasCurrentPage(i + 1)}
                                  isActive={kasCurrentPage === i + 1}
                                  className={`cursor-pointer ${kasCurrentPage === i + 1 ? 'bg-[#0C683B] text-white hover:bg-[#0C683B]/90 border-transparent shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                                >
                                  {i + 1}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setKasCurrentPage(p => Math.min(Math.ceil(bukuKasData.length / kasItemsPerPage), p + 1))}
                                className={`cursor-pointer ${kasCurrentPage === Math.ceil(bukuKasData.length / kasItemsPerPage) ? 'pointer-events-none opacity-50' : 'hover:bg-slate-50'}`}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                </div>
                )
              )}

              {/* TAB 2: ANGGOTA DESA (MEMBERS DIRECTORY) */}
              {activeTab === 'anggota' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-6">
                    <div>
                      <h3 className="font-sans text-2xl font-extrabold text-slate-800 tracking-tight">Daftar Anggota Koperasi</h3>
                      <p className="text-xs text-slate-400 mt-1">Daftar petani, pengrajin desa, dan UMKM terverifikasi</p>
                    </div>

                    <button
                      onClick={() => setShowAddMember(!showAddMember)}
                      className="bg-[#0C683B] hover:bg-[#074e2a] text-white px-5 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                      id="btn-admin-add-member"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Daftarkan Anggota Baru</span>
                    </button>
                  </div>

                  {/* 4 Cards Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                      <div className="relative z-10">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Anggota</p>
                        <h4 className="text-3xl font-black text-slate-800">{members.length}</h4>
                      </div>
                      <Users className="w-12 h-12 text-slate-100 absolute -bottom-1 -right-1 z-0" />
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                      <div className="relative z-10">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Anggota Aktif</p>
                        <h4 className="text-3xl font-black text-[#0C683B]">{activeMembersCount}</h4>
                      </div>
                      <Check className="w-12 h-12 text-[#EAF4EE] absolute -bottom-1 -right-1 z-0" />
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                      <div className="relative z-10">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Menunggu Verif</p>
                        <h4 className="text-3xl font-black text-amber-500">{pendingMembersCount}</h4>
                      </div>
                      <AlertCircle className="w-12 h-12 text-amber-500/10 absolute -bottom-1 -right-1 z-0" />
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                      <div className="relative z-10">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Sektor Usaha</p>
                        <h4 className="text-3xl font-black text-blue-600">{new Set(members.map(m => m.role)).size}</h4>
                      </div>
                      <Building className="w-12 h-12 text-blue-500/10 absolute -bottom-1 -right-1 z-0" />
                    </div>
                  </div>

                  {/* Optional Add Member Form */}
                  <AnimatePresence>
                    {showAddMember && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleAddMemberSubmit}
                        className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 overflow-hidden"
                      >
                        <h4 className="font-sans text-lg font-bold text-slate-800 tracking-tight">
                          {editingMemberId ? 'Ubah Data Anggota' : 'Formulir Pendaftaran Anggota KUD'}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Nama Lengkap</label>
                            <input 
                              type="text" 
                              value={newMemberName}
                              onChange={(e) => setNewMemberName(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0C683B] focus:outline-none"
                              placeholder="Contoh: Pak Suparjo"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Nomor WhatsApp / Telepon</label>
                            <input 
                              type="text" 
                              value={newMemberPhone}
                              onChange={(e) => setNewMemberPhone(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0C683B] focus:outline-none"
                              placeholder="Contoh: 0812345678"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Profesi / Sektor</label>
                            <select 
                              value={newMemberRole}
                              onChange={(e) => setNewMemberRole(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0C683B] focus:outline-none"
                            >
                              <option value="Petani Padi">Petani Padi</option>
                              <option value="Petani Hortikultura">Petani Hortikultura / Cabai</option>
                              <option value="Petani Palawija">Petani Palawija / Jagung</option>
                              <option value="Pengrajin Tradisional">Pengrajin Tradisional</option>
                              <option value="UMKM Kuliner Desa">UMKM Kuliner Desa</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Lokasi / Dusun</label>
                            <input 
                              type="text" 
                              value={newMemberLocation}
                              onChange={(e) => setNewMemberLocation(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0C683B] focus:outline-none"
                              placeholder="Contoh: Dusun Subur Makmur"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                          <button 
                            type="button" 
                            onClick={() => {
                              setShowAddMember(false);
                              setEditingMemberId(null);
                              setNewMemberName('');
                              setNewMemberPhone('');
                              setNewMemberRole('Petani Padi');
                              setNewMemberLocation('Desa Subur Makmur');
                            }}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                          >
                            Batal
                          </button>
                          <button 
                            type="submit" 
                            className="bg-[#0C683B] text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer hover:bg-[#074e2a]"
                          >
                            {editingMemberId ? 'Simpan Perubahan' : 'Simpan Anggota'}
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Table View */}
                  {isLoading ? (
                    <div className="bg-white border border-slate-200 rounded-[10px] p-6 shadow-sm space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-[10px]" />
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-[10px] border border-slate-200 bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="w-[80px]">ID</TableHead>
                          <TableHead>Nama Lengkap</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>Sektor Usaha</TableHead>
                          <TableHead>Tanggal Gabung</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Tindakan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentMembers.map(member => (
                          <TableRow key={member.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-mono font-bold text-slate-800 text-xs">{member.id}</TableCell>
                            <TableCell className="font-bold text-slate-800 text-xs">{member.name}</TableCell>
                            <TableCell className="font-mono text-slate-500 text-xs">{member.phone}</TableCell>
                            <TableCell>
                              <span className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-[10px] font-semibold text-slate-600">
                                {member.role}
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-400 font-mono text-[11px]">{member.joinDate}</TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider ${
                                member.status === 'Aktif' 
                                  ? 'bg-[#EAF4EE] text-[#0C683B] border border-[#EAF4EE]' 
                                  : 'bg-amber-50 text-amber-600 border border-amber-200/50 animate-pulse'
                              }`}>
                                {member.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingMemberId(member.id);
                                  setNewMemberName(member.name);
                                  setNewMemberPhone(member.phone);
                                  setNewMemberRole(member.role);
                                  setNewMemberLocation(member.location || 'Desa Subur Makmur');
                                  setShowAddMember(true);
                                }}
                                className="text-slate-400 hover:text-slate-800 text-[10px] font-bold uppercase cursor-pointer hover:underline"
                              >
                                Edit
                              </button>
                              {member.status === 'Menunggu' ? (
                                <button
                                  onClick={() => handleApproveMember(member.id)}
                                  className="bg-[#0C683B] hover:bg-[#074e2a] text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase cursor-pointer"
                                >
                                  Verifikasi
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateMemberStatus(member.id, member.status)}
                                  className="text-slate-400 hover:text-red-600 text-[10px] font-bold uppercase cursor-pointer hover:underline"
                                >
                                  {member.status === 'Aktif' ? 'Suspend' : 'Aktifkan'}
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  )}

                  {/* Pagination Controls */}
                  {!isLoading && totalMembersPages > 1 && (
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Menampilkan halaman {membersPage} dari {totalMembersPages}
                      </span>
                      <Pagination className="justify-end w-auto mx-0">
                        <PaginationContent className="gap-2">
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setMembersPage(p => Math.max(1, p - 1))}
                              className={membersPage === 1 ? "pointer-events-none opacity-50 bg-white border border-slate-200" : "cursor-pointer bg-white border border-slate-200 hover:bg-slate-50"}
                            />
                          </PaginationItem>
                          {[...Array(totalMembersPages)].map((_, i) => (
                            <PaginationItem key={i}>
                              <PaginationLink 
                                onClick={() => setMembersPage(i + 1)}
                                isActive={membersPage === i + 1}
                                className={`cursor-pointer border border-slate-200 ${membersPage === i + 1 ? 'bg-slate-100 text-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                              >
                                {i + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setMembersPage(p => Math.min(totalMembersPages, p + 1))}
                              className={membersPage === totalMembersPages ? "pointer-events-none opacity-50 bg-white border border-slate-200" : "cursor-pointer bg-white border border-slate-200 hover:bg-slate-50"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PERMODALAN (LOAN APP CONTROL) */}
              {activeTab === 'permodalan' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2">
                    <div>
                      <h3 className="font-sans text-2xl font-extrabold text-slate-800 tracking-tight">
                        {selectedLoanId ? 'Detail Permodalan Rakyat' : 'Pengajuan Permodalan Rakyat'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {selectedLoanId 
                          ? 'Informasi lengkap mengenai pengajuan permodalan ini.'
                          : 'Kelola dan setujui simulasi pinjaman yang diajukan oleh petani & UMKM desa'}
                      </p>
                    </div>
                    {selectedLoanId && (
                      <button 
                        onClick={() => setSelectedLoanId(null)}
                        className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-[10px] flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" /> Kembali
                      </button>
                    )}
                  </div>

                  {selectedLoanId ? (() => {
                    const detailLoan = loans.find(l => l.id === selectedLoanId);
                    if (!detailLoan) return <div className="text-center p-10">Data tidak ditemukan.</div>;
                    return (
                      <div className="bg-white border border-slate-200 rounded-[10px] p-6 sm:p-8 shadow-sm space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Informasi Pemohon</p>
                              <p className="font-bold text-lg text-slate-800">{detailLoan.name}</p>
                              <p className="text-sm font-mono text-slate-500 mt-1">{detailLoan.phone}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Tujuan Permodalan</p>
                              <p className="text-sm text-slate-700 leading-relaxed p-4 bg-slate-50 rounded-[10px] border border-slate-100">
                                {detailLoan.purpose}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="bg-slate-50 border border-slate-200 rounded-[10px] p-5 space-y-4">
                              <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                                <span className="text-xs font-bold text-slate-500">Skema Pinjaman</span>
                                <span className="font-bold text-sm text-slate-800 bg-[#EAF4EE] text-[#0C683B] px-3 py-1 rounded-[10px] uppercase tracking-wide">
                                  {detailLoan.type}
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                                <span className="text-xs font-bold text-slate-500">Besar Pengajuan</span>
                                <span className="font-mono font-bold text-lg text-slate-800">{formatRupiah(detailLoan.amount)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500">Tenor Waktu</span>
                                <span className="font-mono font-bold text-sm text-slate-800">{detailLoan.tenure} Bulan</span>
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Status Persetujuan (Tanggung Renteng)</p>
                              <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-[10px] p-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-500">Persetujuan Kelompok</span>
                                    <span className="text-slate-800">{detailLoan.quorum?.setuju || 0} dari {detailLoan.quorum?.total || 0} Suara</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500 transition-all duration-500" 
                                      style={{ width: `${Math.min(100, ((detailLoan.quorum?.setuju || 0) / Math.max(1, (detailLoan.quorum?.total || 1))) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  <span className={`px-4 py-2 rounded-[10px] text-[10px] font-bold uppercase tracking-wider block text-center ${
                                    detailLoan.status === 'Disetujui' 
                                      ? 'bg-[#0C683B] text-white' 
                                      : detailLoan.status === 'Ditolak' 
                                      ? 'bg-red-600 text-white' 
                                      : 'bg-slate-800 text-white'
                                  }`}>
                                    {detailLoan.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })() : isLoading ? (
                    <div className="bg-white border border-slate-200 rounded-[10px] p-6 shadow-sm space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-[10px]" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto bg-white border border-slate-200 shadow-sm rounded-[10px] flex flex-col">
                    <Table>
                      <TableHeader className="bg-[#f8faf9] sticky top-0 z-10">
                        <TableRow className="border-b border-slate-200 hover:bg-[#f8faf9]">
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[80px]">ID</TableHead>
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Pemohon</TableHead>
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Skema</TableHead>
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Besar Permodalan</TableHead>
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tenor</TableHead>
                          <TableHead className="py-4 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Keperluan Usaha</TableHead>
                          <TableHead className="py-4 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                          <TableHead className="py-4 px-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Kuorum Persetujuan (Sosial)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.slice((permodalanPage - 1) * itemsPerPage, permodalanPage * itemsPerPage).map(loan => (
                          <TableRow 
                            key={loan.id} 
                            onClick={() => setSelectedLoanId(loan.id)}
                            className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer"
                          >
                            <TableCell className="py-4 px-5 font-mono font-bold text-slate-800 text-xs">{loan.id}</TableCell>
                            <TableCell className="py-4 px-5">
                              <p className="font-bold text-sm text-slate-800">{loan.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{loan.phone}</p>
                            </TableCell>
                            <TableCell className="py-4 px-5">
                              <span className={`px-2.5 py-1 rounded-[10px] text-[10px] font-bold uppercase ${
                                loan.type === 'Yarnen' 
                                  ? 'bg-[#F59E0B] text-white border-transparent' 
                                  : 'bg-[#0C683B] text-white border-transparent'
                              }`}>
                                {loan.type}
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-5 font-mono font-bold text-slate-800 text-sm">{formatRupiah(loan.amount)}</TableCell>
                            <TableCell className="py-4 px-5 font-mono text-xs text-slate-500">{loan.tenure} Bulan</TableCell>
                            <TableCell className="py-4 px-5 text-xs text-slate-600 max-w-xs truncate" title={loan.purpose}>
                              {loan.purpose}
                            </TableCell>
                            <TableCell className="py-4 px-5 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-[10px] text-[10px] font-bold uppercase tracking-wider ${
                                loan.status === 'Disetujui' 
                                  ? 'bg-[#0C683B] text-white border-transparent' 
                                  : loan.status === 'Ditolak' 
                                  ? 'bg-red-600 text-white border-transparent' 
                                  : 'bg-slate-800 text-white border-transparent'
                              }`}>
                                {loan.status}
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-5 text-right">
                              {loan.status === 'Menunggu' ? (
                                <div className="flex flex-col items-end gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500">Tanggung Renteng:</span>
                                    <span className="text-xs font-mono font-bold text-slate-800">{loan.quorum?.setuju || 0} / {loan.quorum?.total || 0}</span>
                                  </div>
                                  <div className="w-24 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                                    <div 
                                      className="h-full bg-amber-400 transition-all duration-500" 
                                      style={{ width: `${Math.min(100, ((loan.quorum?.setuju || 0) / Math.max(1, (loan.quorum?.total || 1))) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-end gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-[#0C683B]">Kuorum Terpenuhi</span>
                                    <span className="text-xs font-mono font-bold text-[#0C683B]">{loan.quorum?.setuju || 0} / {loan.quorum?.total || 0}</span>
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  {loans.length > 0 && (
                    <div className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs font-medium text-slate-500">
                        Menampilkan <span className="font-bold text-slate-800">{(permodalanPage - 1) * itemsPerPage + 1}-{Math.min(permodalanPage * itemsPerPage, loans.length)}</span> dari <span className="font-bold text-slate-800">{loans.length}</span> data
                      </div>
                      
                      {loans.length > itemsPerPage && (
                        <div className="flex-shrink-0">
                          <Pagination className="mx-0 w-auto justify-end">
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious 
                                  href="#" 
                                  onClick={(e) => { e.preventDefault(); setPermodalanPage(p => Math.max(1, p - 1)); }}
                                  className={permodalanPage === 1 ? "pointer-events-none opacity-50 bg-transparent border-transparent" : "cursor-pointer bg-white"}
                                />
                              </PaginationItem>
                              {Array.from({ length: Math.ceil(loans.length / itemsPerPage) }).map((_, i) => (
                                <PaginationItem key={i}>
                                  <PaginationLink 
                                    href="#" 
                                    isActive={permodalanPage === i + 1}
                                    onClick={(e) => { e.preventDefault(); setPermodalanPage(i + 1); }}
                                    className={permodalanPage === i + 1 ? "bg-[#0C683B] text-white hover:bg-[#0C683B]/90 border-transparent shadow-md" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}
                                  >
                                    {i + 1}
                                  </PaginationLink>
                                </PaginationItem>
                              ))}
                              <PaginationItem>
                                <PaginationNext 
                                  href="#" 
                                  onClick={(e) => { e.preventDefault(); setPermodalanPage(p => Math.min(Math.ceil(loans.length / itemsPerPage), p + 1)); }}
                                  className={permodalanPage === Math.ceil(loans.length / itemsPerPage) ? "pointer-events-none opacity-50 bg-transparent border-transparent" : "cursor-pointer bg-white"}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                    </div>
                  )}
                  </>
                )}
                </div>
              )}

              {/* TAB 4: KOMODITAS (COMMODITY CONTROLLER) */}
              {activeTab === 'komoditas' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2">
                    <div>
                      <h3 className="font-sans text-2xl font-extrabold text-slate-800 tracking-tight">Kontroler Harga Komoditas & Grafik Pasar</h3>
                      <p className="text-xs text-slate-400 mt-1">Perbarui harga pasar hasil tani desa. Perubahan ini akan segera terlihat di situs publik secara real-time.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left list */}
                    <div className="space-y-4 bg-white p-6 border border-slate-200 shadow-sm rounded-[10px]">
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100 pb-2">Daftar Komoditas Aktif</label>
                      {isLoading ? (
                        <div className="space-y-4">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="p-4 rounded-[10px] border border-slate-200 bg-slate-50 flex flex-col gap-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32 bg-slate-200" />
                                  <Skeleton className="h-3 w-16 bg-slate-200" />
                                </div>
                                <div className="space-y-2 text-right flex flex-col items-end">
                                  <Skeleton className="h-4 w-24 bg-slate-200" />
                                  <Skeleton className="h-3 w-12 bg-emerald-100" />
                                </div>
                              </div>
                              <Skeleton className="h-12 w-full bg-slate-200 mt-2" />
                              <Skeleton className="h-10 w-full bg-white rounded-lg mt-1" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        commodities.map(comm => {
                          const isEditing = editingCommodityId === comm.id;
                        return (
                          <div 
                            key={comm.id} 
                            className={`p-4 rounded-[10px] border transition-all duration-300 ${
                              isEditing 
                                ? 'border-[#0C683B] bg-[#EAF4EE]' 
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm">{comm.name}</h4>
                                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">ID: {comm.id}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-bold text-sm text-slate-800">Rp {comm.price.toLocaleString('id-ID')}/{comm.unit}</p>
                                <span className={`text-[10px] font-bold ${
                                  comm.trend === 'up' ? 'text-emerald-600' : comm.trend === 'down' ? 'text-red-600' : 'text-neutral-500'
                                }`}>{comm.change}</span>
                              </div>
                            </div>
                            
                            {/* Custom Tailwind Mini Chart */}
                            <div className="mt-4 flex items-end gap-1 h-12 pt-2 border-t border-slate-100/50">
                              {[0.4, 0.6, 0.5, 0.7, 0.9, 0.8, 1].map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col justify-end h-full group relative">
                                  <div 
                                    className={`w-full rounded-t-sm transition-all duration-300 group-hover:opacity-100 ${
                                      comm.trend === 'up' ? 'bg-[#0C683B] opacity-60' : comm.trend === 'down' ? 'bg-red-500 opacity-60' : 'bg-slate-400 opacity-60'
                                    }`}
                                    style={{ height: `${h * 100}%` }}
                                  ></div>
                                </div>
                              ))}
                            </div>

                            <p className="text-xs text-slate-600 font-medium leading-relaxed mt-3 bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-sm">
                              "{comm.info}"
                            </p>

                            {!isEditing && (
                              <div className="flex justify-end mt-3 border-t border-slate-100 pt-3">
                                <button
                                  onClick={() => handleEditCommodity(comm)}
                                  className="text-[#0C683B] hover:text-[#074e2a] text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1 hover:underline"
                                  id={`btn-edit-${comm.id}`}
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Ubah Harga</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    </div>

                    {/* Right Editor Form panel */}
                    <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-[10px] h-fit space-y-6 sticky top-24">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                        <Sprout className="w-5 h-5 text-[#0C683B]" />
                        <h4 className="font-sans font-extrabold text-lg text-slate-800 tracking-tight">Panel Modifikasi Harga</h4>
                      </div>

                      {editingCommodityId ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-slate-400 uppercase font-semibold">Komoditas Terpilih</p>
                            <p className="font-bold text-slate-800 mt-1">
                              {commodities.find(c => c.id === editingCommodityId)?.name}
                            </p>
                          </div>

                          <div>
                            <label htmlFor="input-edit-price" className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">
                              Harga Baru (per {commodities.find(c => c.id === editingCommodityId)?.unit})
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                              <input 
                                id="input-edit-price"
                                type="number" 
                                value={editPriceValue}
                                onChange={(e) => setEditPriceValue(Number(e.target.value))}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-[10px] text-xs font-mono font-bold focus:border-[#0C683B] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label htmlFor="input-edit-info" className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">
                              Informasi Pasar Tambahan
                            </label>
                            <textarea 
                              id="input-edit-info"
                              value={editInfoValue}
                              onChange={(e) => setEditInfoValue(e.target.value)}
                              rows={3}
                              className="w-full p-3 bg-white border border-slate-200 rounded-[10px] text-xs leading-relaxed focus:border-[#0C683B] focus:outline-none"
                              placeholder="Jelaskan faktor pergerakan harga komoditas..."
                            />
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() => setEditingCommodityId(null)}
                              className="w-1/2 py-2.5 border border-slate-200 text-slate-500 hover:text-slate-800 font-bold rounded-[10px] text-xs uppercase cursor-pointer text-center bg-white"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleSaveCommodityPrice(editingCommodityId)}
                              className="w-1/2 py-2.5 bg-[#0C683B] hover:bg-[#074e2a] text-white font-bold rounded-[10px] text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm"
                              id="btn-save-commodity-price"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Simpan</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 space-y-3">
                          <div className="w-12 h-12 rounded-[10px] bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            <Edit2 className="w-5 h-5" />
                          </div>
                          <p className="text-xs text-slate-400 italic max-w-[200px] mx-auto leading-relaxed">
                            Silakan pilih salah satu komoditas hasil tani di sebelah kiri untuk mulai mengubah harganya.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PENGATURAN */}
              {activeTab === 'pengaturan' && (
                <div className="space-y-6 w-full">
                  <div>
                    <h2 className="text-xl font-bold font-serif text-slate-800 italic">Pengaturan Sistem</h2>
                    <p className="text-xs text-slate-500 mt-1">Konfigurasi admin KUD & integrasi AI</p>
                  </div>

                  <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-8">
                    {/* Setting Item 1 */}
                    <div className="flex items-start justify-between gap-6 border-b border-slate-100 pb-8">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                          <Cpu className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Parallel Orchestra (10 Agent)</h3>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md">
                            Izinkan AI memproses data panen dan pencatatan utang secara paralel untuk performa maksimal.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const btn = document.getElementById('toggle-po');
                          if (btn) btn.classList.toggle('bg-[#0C683B]');
                          if (btn) btn.classList.toggle('bg-slate-300');
                          const circle = document.getElementById('toggle-po-circle');
                          if (circle) circle.classList.toggle('translate-x-6');
                          if (circle) circle.classList.toggle('translate-x-1');
                        }}
                        id="toggle-po"
                        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors bg-[#0C683B]"
                      >
                        <span id="toggle-po-circle" className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                      </button>
                    </div>

                    {/* Setting Item 2 */}
                    <div className="flex items-start justify-between gap-6 border-b border-slate-100 pb-8">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                          <Smartphone className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Notifikasi WhatsApp (Baileys)</h3>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md">
                            Kirim tagihan renteng secara otomatis ke WhatsApp anggota melalui integrasi Baileys.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const btn = document.getElementById('toggle-wa');
                          if (btn) btn.classList.toggle('bg-[#0C683B]');
                          if (btn) btn.classList.toggle('bg-slate-300');
                          const circle = document.getElementById('toggle-wa-circle');
                          if (circle) circle.classList.toggle('translate-x-6');
                          if (circle) circle.classList.toggle('translate-x-1');
                        }}
                        id="toggle-wa"
                        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors bg-[#0C683B]"
                      >
                        <span id="toggle-wa-circle" className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                      </button>
                    </div>

                    {/* Setting Item 3 */}
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <ShieldAlert className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Sinkronisasi Pusat</h3>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md">
                            Otomatis sinkronkan laporan kas KUD ke server SPPG pusat setiap jam 12 malam.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const btn = document.getElementById('toggle-sync');
                          if (btn) btn.classList.toggle('bg-[#0C683B]');
                          if (btn) btn.classList.toggle('bg-slate-300');
                          const circle = document.getElementById('toggle-sync-circle');
                          if (circle) circle.classList.toggle('translate-x-6');
                          if (circle) circle.classList.toggle('translate-x-1');
                        }}
                        id="toggle-sync"
                        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors bg-slate-300"
                      >
                        <span id="toggle-sync-circle" className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="px-6 py-3 bg-[#0C683B] text-white font-bold text-xs rounded-xl hover:bg-[#074e2a] transition-all flex items-center gap-2 disabled:opacity-70 cursor-pointer"
                    >
                      {isSavingSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSavingSettings ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
