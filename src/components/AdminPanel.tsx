import { useState } from 'react';
import { User, AttendanceRecord } from '../types';
import { MASTER_USERS, GOOGLE_SCRIPT_URL } from '../constants';
import { LogOut, Filter, Printer, Trash2, CalendarCheck, AlertTriangle, FileText, Search } from 'lucide-react';

interface AdminPanelProps {
  user: User;
  database: AttendanceRecord[];
  onLogout: () => void;
  onRefresh: () => Promise<void>;
  showLoader: (text: string) => void;
  hideLoader: () => void;
}

export default function AdminPanel({
  user,
  database,
  onLogout,
  onRefresh,
  showLoader,
  hideLoader
}: AdminPanelProps) {
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const [selectedGuru, setSelectedGuru] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState('');

  const months = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  // List of all non-admin teachers / staff
  const staffList = MASTER_USERS.filter((u) => u.role !== 'admin');

  // Filter logic
  const currentYear = new Date().getFullYear();
  const monthPrefix = `${currentYear}-${selectedMonth}`;

  let filteredRecords = database.filter((record) => {
    const matchesMonth = String(record.date).startsWith(monthPrefix);
    const matchesGuru = selectedGuru ? String(record.id_user) === selectedGuru : true;
    const matchesSearch = searchQuery
      ? record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(record.id_user).includes(searchQuery)
      : true;

    return matchesMonth && matchesGuru && matchesSearch;
  });

  const handleResetData = async () => {
    const confirmed = window.confirm(
      '⚠️ APAKAH ANDA YAKIN? Semua data absensi di Spreadsheet akan dihapus secara permanen!'
    );
    if (!confirmed) return;

    showLoader('Menghapus Seluruh Data di Spreadsheet...');
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'clear' })
      });
      const resData = await response.json();
      if (resData.status === 'success') {
        alert('Seluruh data berhasil direset!');
        await onRefresh();
      } else {
        alert('Gagal mereset data: ' + (resData.message || 'Error tidak diketahui'));
      }
    } catch (error) {
      console.error(error);
      alert('Gagal mengirim perintah reset data. Silakan coba kembali.');
    } finally {
      hideLoader();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Admin Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 no-print">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/15">
              <CalendarCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900">
                Panel Administrator
              </h2>
              <p className="text-xs text-slate-400 font-semibold font-sans uppercase tracking-widest mt-0.5">
                Rekapitulasi Absensi Guru &amp; Pegawai
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-5 py-3 bg-red-50 text-red-600 rounded-xl font-bold font-sans text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sesi</span>
          </button>
        </header>

        {/* Filter Bar (Hidden when printing) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
          
          {/* Guru Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider font-sans">
              Filter Guru / Pegawai
            </label>
            <div className="relative">
              <select
                value={selectedGuru}
                onChange={(e) => setSelectedGuru(e.target.value)}
                className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none font-sans font-semibold text-slate-700 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer appearance-none"
              >
                <option value="">-- Semua Guru &amp; Staf --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Month Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider font-sans">
              Filter Bulan
            </label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none font-sans font-semibold text-slate-700 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer appearance-none"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({currentYear})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Text Search */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider font-sans">
              Pencarian Cepat
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan nama..."
                className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none font-sans font-semibold text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:bg-white transition-all"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </div>

        </div>

        {/* Action Controls (Reset & Print) */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 no-print">
          <p className="text-xs text-slate-400 font-semibold font-sans">
            Menampilkan <span className="text-slate-800 font-bold">{filteredRecords.length}</span> baris rekapitulasi.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleResetData}
              className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/10 transition-all flex items-center justify-center gap-2 font-sans text-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset Semua Data Spreadsheet</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10 transition-all flex items-center justify-center gap-2 font-sans text-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Printable Report Header */}
          <div className="hidden print:block p-8 text-center border-b border-slate-300 space-y-2">
            <h1 className="text-2xl font-black font-display text-slate-900">SDK ST. YOSEPH KUAPUTU</h1>
            <p className="text-xs font-bold uppercase tracking-wider font-sans text-slate-500">
              Laporan Rekapitulasi Absensi Bulanan • {months.find((m) => m.value === selectedMonth)?.label} {currentYear}
            </p>
            <div className="border-t border-slate-400 w-32 mx-auto pt-2 mt-4 text-[10px] font-sans text-slate-400">
              Dicetak pada {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-sans">
                <tr className="text-[10px] font-black uppercase tracking-wider">
                  <th className="p-4 text-center border-r border-slate-100 w-16">No</th>
                  <th className="p-4 border-r border-slate-100">Nama Lengkap</th>
                  <th className="p-4 text-center border-r border-slate-100 w-36">Tanggal</th>
                  <th className="p-4 text-center border-r border-slate-100 w-32 text-emerald-700 bg-emerald-50/30">Jam Masuk</th>
                  <th className="p-4 text-center w-32 text-orange-700 bg-orange-50/30">Jam Pulang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-sm">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((r, i) => {
                    // split checkin time if combined
                    const isCombined = r.time.includes(' - ');
                    const parts = isCombined ? r.time.split(' - ') : [r.time];
                    
                    let displayMasuk = '-';
                    let displayPulang = '-';

                    if (r.status === 'MASUK') {
                      displayMasuk = parts[0];
                    } else if (r.status === 'PULANG') {
                      displayPulang = parts[0];
                    } else if (r.status === 'MASUK & PULANG') {
                      displayMasuk = parts[0] || '-';
                      displayPulang = parts[1] || '-';
                    }

                    return (
                      <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4 text-center font-mono text-xs border-r border-slate-100 text-slate-400">
                          {i + 1}
                        </td>
                        <td className="p-4 font-bold text-slate-800 border-r border-slate-100">
                          {r.name}
                        </td>
                        <td className="p-4 text-center font-medium text-slate-500 border-r border-slate-100">
                          {r.date}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-emerald-600 border-r border-slate-100 bg-emerald-50/5">
                          {displayMasuk}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-orange-600 bg-orange-50/5">
                          {displayPulang}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <FileText className="w-10 h-10 text-slate-300" />
                        <span>Tidak ada data absensi untuk filter terpilih.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
