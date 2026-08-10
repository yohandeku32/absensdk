import { useMemo, useState } from 'react';
import { User, AttendanceRecord } from '../types';
import { MASTER_USERS } from '../constants';
import {
  CalendarCheck,
  Download,
  FileText,
  Filter,
  LogOut,
  Printer,
  RefreshCw,
  Search
} from 'lucide-react';

interface AdminPanelProps {
  user: User;
  database: AttendanceRecord[];
  onLogout: () => void;
  onRefresh: () => Promise<void>;
  showLoader: (text: string) => void;
  hideLoader: () => void;
}

interface GuruGroup {
  id_user: string;
  name: string;
  nip?: string | null;
  nik?: string | null;
  status_kepegawaian?: string | null;
  golongan_ruang?: string | null;
  jabatan?: string | null;
  records: AttendanceRecord[];
}

const MONTHS = [
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

function formatDateIndonesia(value: string) {
  const parts = String(value).split('-');
  if (parts.length !== 3) return value || '-';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function getJam(record: AttendanceRecord) {
  if (record.jam_masuk || record.jam_pulang) {
    return {
      masuk: record.jam_masuk || '-',
      pulang: record.jam_pulang || '-'
    };
  }

  const parts = String(record.time || '').split(' - ');

  if (record.status === 'MASUK & PULANG') {
    return {
      masuk: parts[0] || '-',
      pulang: parts[1] || '-'
    };
  }

  if (record.status === 'PULANG') {
    return { masuk: '-', pulang: parts[0] || '-' };
  }

  return { masuk: parts[0] || '-', pulang: '-' };
}

function driveThumbnail(fileId?: string | null) {
  if (!fileId) return '';
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w700`;
}

function driveViewUrl(fileId?: string | null) {
  if (!fileId) return '#';
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

function AttendancePhoto({
  fileId,
  alt
}: {
  fileId?: string | null;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!fileId) {
    return (
      <div className="photo-placeholder">
        <span>Tidak ada foto</span>
      </div>
    );
  }

  if (failed) {
    return (
      <a
        href={driveViewUrl(fileId)}
        target="_blank"
        rel="noreferrer"
        className="photo-placeholder no-underline"
      >
        <span>Buka foto di Drive</span>
      </a>
    );
  }

  return (
    <a
      href={driveViewUrl(fileId)}
      target="_blank"
      rel="noreferrer"
      className="block"
      title="Buka foto di Google Drive"
    >
      <img
        src={driveThumbnail(fileId)}
        alt={alt}
        loading="eager"
        className="attendance-photo"
        onError={() => setFailed(true)}
      />
    </a>
  );
}

export default function AdminPanel({
  user,
  database,
  onLogout,
  onRefresh,
  showLoader,
  hideLoader
}: AdminPanelProps) {
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = now.getFullYear();

  const [selectedGuru, setSelectedGuru] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [searchQuery, setSearchQuery] = useState('');

  const staffList = MASTER_USERS.filter((u) => u.role !== 'admin');

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);

    database.forEach((record) => {
      const year = Number(String(record.date).slice(0, 4));
      if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
        years.add(year);
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [database, currentYear]);

  const filteredRecords = useMemo(() => {
    const monthPrefix = `${selectedYear}-${selectedMonth}`;
    const query = searchQuery.trim().toLowerCase();

    return database
      .filter((record) => {
        const matchesMonth = String(record.date).startsWith(monthPrefix);
        const matchesGuru = selectedGuru
          ? String(record.id_user) === selectedGuru
          : true;

        const searchable = [
          record.name,
          record.id_user,
          record.nip,
          record.nik,
          record.jabatan,
          record.status_kepegawaian
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesSearch = query ? searchable.includes(query) : true;

        return matchesMonth && matchesGuru && matchesSearch;
      })
      .sort((a, b) => {
        const byName = String(a.name).localeCompare(String(b.name), 'id');
        if (byName !== 0) return byName;
        return String(a.date).localeCompare(String(b.date));
      });
  }, [database, searchQuery, selectedGuru, selectedMonth, selectedYear]);

  const groupedRecords = useMemo<GuruGroup[]>(() => {
    const groups = new Map<string, GuruGroup>();

    filteredRecords.forEach((record) => {
      const key = String(record.id_user);
      const existing = groups.get(key);

      if (existing) {
        existing.records.push(record);
        return;
      }

      groups.set(key, {
        id_user: key,
        name: record.name,
        nip: record.nip,
        nik: record.nik,
        status_kepegawaian: record.status_kepegawaian,
        golongan_ruang: record.golongan_ruang,
        jabatan: record.jabatan,
        records: [record]
      });
    });

    return Array.from(groups.values());
  }, [filteredRecords]);

  const selectedMonthLabel =
    MONTHS.find((month) => month.value === selectedMonth)?.label || '';

  const EXPORT_EXCEL_URL =
    'https://absensdk.vercel.app/api/export-excel';

  const EXPORT_WORD_URL =
    'https://absensdk.vercel.app/api/export-word';

  const handleRefresh = async () => {
    showLoader('Memperbarui Data TiDB...');
    try {
      await onRefresh();
    } finally {
      hideLoader();
    }
  };


  const handleDownloadExcel = () => {
    if (filteredRecords.length === 0) {
      return;
    }

    const params = new URLSearchParams({
      bulan: selectedMonth,
      tahun: selectedYear
    });

    if (selectedGuru) {
      params.set('id_user', selectedGuru);
    }

    const url = `${EXPORT_EXCEL_URL}?${params.toString()}`;

    window.open(url, '_blank');
  };

  const handleDownloadWord = () => {
    if (filteredRecords.length === 0) {
      return;
    }

    const params = new URLSearchParams({
      bulan: selectedMonth,
      tahun: selectedYear
    });

    if (selectedGuru) {
      params.set('id_user', selectedGuru);
    }

    const url = `${EXPORT_WORD_URL}?${params.toString()}`;

    window.open(url, '_blank');
  };

  const handlePrint = async () => {
    showLoader('Menyiapkan Foto untuk Dicetak...');

    try {
      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>('img.attendance-photo')
      );

      await Promise.race([
        Promise.all(
          images.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete) {
                  resolve();
                  return;
                }

                const done = () => resolve();
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
              })
          )
        ),
        new Promise<void>((resolve) => setTimeout(resolve, 7000))
      ]);
    } finally {
      hideLoader();
    }

    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-6 sm:px-6 admin-report-page">
      <style>{`
        .attendance-photo {
          width: 132px;
          height: 170px;
          object-fit: cover;
          display: block;
          margin: 0 auto;
          border-radius: 10px;
          background: #f1f5f9;
        }

        .photo-placeholder {
          width: 132px;
          height: 170px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 10px;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          background: #f8fafc;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 7mm;
          }

          html,
          body,
          #root {
            background: #ffffff !important;
          }

          body {
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .admin-report-page {
            min-height: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
          }

          .report-shell {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .report-table-wrap {
            overflow: visible !important;
          }

          .report-table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-family: Arial, sans-serif !important;
            color: #000 !important;
          }

          .report-table thead {
            display: table-header-group !important;
          }

          .report-table th,
          .report-table td {
            border: 1px solid #000 !important;
            padding: 2.2mm 1.5mm !important;
            color: #000 !important;
            background: #fff !important;
            font-size: 8pt !important;
            line-height: 1.3 !important;
          }

          .report-table th {
            font-size: 7.5pt !important;
            font-weight: 700 !important;
            text-align: center !important;
            vertical-align: middle !important;
          }

          .report-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .report-no-col {
            width: 8mm !important;
          }

          .report-identity-col {
            width: 58mm !important;
          }

          .report-date-col {
            width: 24mm !important;
          }

          .report-time-col {
            width: 30mm !important;
          }

          .report-status-col {
            width: 34mm !important;
          }

          .report-note-col {
            width: 25mm !important;
          }

          .report-photo-col {
            width: 43mm !important;
          }

          .attendance-photo,
          .photo-placeholder {
            width: 38mm !important;
            height: 49mm !important;
            border-radius: 0 !important;
          }

          .photo-placeholder {
            border: 1px solid #777 !important;
            color: #555 !important;
            font-size: 7pt !important;
          }

          .identity-label {
            display: inline-block !important;
            width: 14mm !important;
            font-weight: 700 !important;
          }

          .screen-only {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1600px] space-y-5">
        {/* HEADER ADMIN */}
        <header className="no-print screen-only flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/15 bg-amber-500/10 text-amber-600">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-black text-slate-900 sm:text-2xl">
                Panel Administrator
              </h2>
              <p className="mt-0.5 font-sans text-xs font-semibold uppercase tracking-widest text-slate-400">
                Rekapitulasi Absensi Guru &amp; Pegawai
              </p>
              <p className="mt-1 font-sans text-[11px] font-semibold text-slate-400">
                Login sebagai {user.name}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-red-50 px-5 py-3 font-sans text-xs font-bold text-red-600 transition-all hover:bg-red-100 sm:self-auto"
          >
            <LogOut className="h-4 w-4" />
            Keluar Sesi
          </button>
        </header>

        {/* FILTER */}
        <div className="no-print screen-only grid grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <label className="block font-sans text-[10px] font-black uppercase tracking-wider text-slate-400">
              Guru / Pegawai
            </label>
            <div className="relative">
              <select
                value={selectedGuru}
                onChange={(e) => setSelectedGuru(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-slate-50/50 p-4 font-sans font-semibold text-slate-700 outline-none transition-all focus:border-emerald-500 focus:bg-white"
              >
                <option value="">Semua Guru &amp; Pegawai</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-sans text-[10px] font-black uppercase tracking-wider text-slate-400">
              Bulan
            </label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-slate-50/50 p-4 font-sans font-semibold text-slate-700 outline-none transition-all focus:border-emerald-500 focus:bg-white"
              >
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-sans text-[10px] font-black uppercase tracking-wider text-slate-400">
              Tahun
            </label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-slate-50/50 p-4 font-sans font-semibold text-slate-700 outline-none transition-all focus:border-emerald-500 focus:bg-white"
              >
                {availableYears.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-sans text-[10px] font-black uppercase tracking-wider text-slate-400">
              Pencarian
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama, NIP/NIK, jabatan..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 pr-11 font-sans font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
              />
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {/* ACTION */}
        <div className="no-print screen-only flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-xs font-semibold text-slate-500">
            <span className="font-black text-slate-800">{groupedRecords.length}</span> guru/pegawai •{' '}
            <span className="font-black text-slate-800">{filteredRecords.length}</span> baris absensi
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleRefresh}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-sans text-xs font-bold text-white transition-all hover:bg-slate-900"
            >
              <RefreshCw className="h-4 w-4" />
              Perbarui Data
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={filteredRecords.length === 0}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-sans text-xs font-bold text-white shadow-lg shadow-emerald-600/10 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Download Excel
            </button>

            <button
              onClick={handleDownloadWord}
              disabled={filteredRecords.length === 0}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-sans text-xs font-bold text-white shadow-lg shadow-indigo-600/10 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileText className="h-4 w-4" />
              Download Word
            </button>

            <button
              onClick={handlePrint}
              disabled={filteredRecords.length === 0}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-sans text-xs font-bold text-white shadow-lg shadow-blue-600/10 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer className="h-4 w-4" />
              Cetak Laporan
            </button>
          </div>
        </div>

        {/* REPORT */}
        <div className="report-shell overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 text-center sm:px-8">
            <h1 className="font-display text-xl font-black uppercase text-slate-900 print:text-[14pt]">
              Laporan Absensi Guru dan Pegawai
            </h1>
            <p className="mt-1 font-sans text-sm font-bold uppercase text-slate-600 print:text-[10pt]">
              SDK St. Yoseph Kuaputu
            </p>
            <p className="mt-1 font-sans text-xs font-semibold text-slate-500 print:text-[9pt]">
              Bulan {selectedMonthLabel} {selectedYear}
              {selectedGuru
                ? ` • ${staffList.find((staff) => staff.id === selectedGuru)?.name || ''}`
                : ''}
            </p>
            <p className="print-only hidden mt-1 font-sans text-[8pt] text-slate-500">
              Dicetak pada{' '}
              {new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>

          <div className="report-table-wrap overflow-x-auto">
            <table className="report-table w-full min-w-[1450px] border-collapse text-left font-sans">
              <thead className="bg-slate-100 text-slate-700">
                <tr className="text-[10px] font-black uppercase tracking-wide">
                  <th className="report-no-col border border-slate-300 p-3 text-center">No</th>
                  <th className="report-identity-col border border-slate-300 p-3 text-center">
                    Nama / NIP-NIK / Jabatan
                  </th>
                  <th className="report-date-col border border-slate-300 p-3 text-center">Tanggal</th>
                  <th className="report-time-col border border-slate-300 p-3 text-center">Jam</th>
                  <th className="report-status-col border border-slate-300 p-3 text-center">Status</th>
                  <th className="report-note-col border border-slate-300 p-3 text-center">Keterangan</th>
                  <th className="report-photo-col border border-slate-300 p-3 text-center">Foto Masuk</th>
                  <th className="report-photo-col border border-slate-300 p-3 text-center">Foto Pulang</th>
                </tr>
              </thead>

              <tbody className="text-sm text-slate-700">
                {groupedRecords.length > 0 ? (
                  groupedRecords.flatMap((group, groupIndex) =>
                    group.records.map((record, recordIndex) => {
                      const jam = getJam(record);
                      const isFirstRecord = recordIndex === 0;
                      const identityNumber = group.nip || group.nik || group.id_user || '-';
                      const identityLabel = group.nip ? 'NIP' : group.nik ? 'NIK' : 'ID';

                      return (
                        <tr
                          key={`${group.id_user}-${record.date}-${recordIndex}`}
                          className="align-top transition-colors hover:bg-slate-50"
                        >
                          {isFirstRecord && (
                            <>
                              <td
                                rowSpan={group.records.length}
                                className="border border-slate-300 p-3 text-center align-top font-bold text-slate-700"
                              >
                                {groupIndex + 1}
                              </td>

                              <td
                                rowSpan={group.records.length}
                                className="border border-slate-300 p-4 align-top text-[12px] leading-6 text-slate-800"
                              >
                                <div>
                                  <span className="identity-label inline-block w-[72px] font-bold">Nama</span>
                                  <span className="mr-1">:</span>
                                  <span className="font-semibold">{group.name || '-'}</span>
                                </div>
                                <div>
                                  <span className="identity-label inline-block w-[72px] font-bold">{identityLabel}</span>
                                  <span className="mr-1">:</span>
                                  <span>{identityNumber}</span>
                                </div>
                                <div>
                                  <span className="identity-label inline-block w-[72px] font-bold">Status</span>
                                  <span className="mr-1">:</span>
                                  <span>{group.status_kepegawaian || '-'}</span>
                                </div>
                                <div>
                                  <span className="identity-label inline-block w-[72px] font-bold">Gol.Ruang</span>
                                  <span className="mr-1">:</span>
                                  <span>{group.golongan_ruang || '-'}</span>
                                </div>
                                <div>
                                  <span className="identity-label inline-block w-[72px] font-bold">Jabatan</span>
                                  <span className="mr-1">:</span>
                                  <span>{group.jabatan || '-'}</span>
                                </div>
                              </td>
                            </>
                          )}

                          <td className="border border-slate-300 p-3 text-center align-middle font-mono text-xs font-semibold">
                            {formatDateIndonesia(record.date)}
                          </td>

                          <td className="border border-slate-300 p-3 text-center align-middle font-mono text-xs font-bold">
                            <span className="text-emerald-700">{jam.masuk}</span>
                            <span className="mx-1 text-slate-400">-</span>
                            <span className="text-orange-700">{jam.pulang}</span>
                          </td>

                          <td className="border border-slate-300 p-3 text-center align-middle text-[11px] font-black">
                            {record.status || '-'}
                          </td>

                          <td className="border border-slate-300 p-3 text-center align-middle text-xs">
                            {record.keterangan || '-'}
                          </td>

                          <td className="border border-slate-300 p-2 text-center align-middle">
                            <AttendancePhoto
                              fileId={record.foto_masuk_file_id}
                              alt={`Foto masuk ${record.name} ${record.date}`}
                            />
                          </td>

                          <td className="border border-slate-300 p-2 text-center align-middle">
                            <AttendancePhoto
                              fileId={record.foto_pulang_file_id}
                              alt={`Foto pulang ${record.name} ${record.date}`}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )
                ) : (
                  <tr>
                    <td colSpan={8} className="p-14 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <FileText className="h-10 w-10 text-slate-300" />
                        <span className="font-medium italic">
                          Tidak ada data absensi pada bulan dan tahun yang dipilih.
                        </span>
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
