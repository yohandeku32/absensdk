import React, { useState } from 'react';
import { ScanFace, UserCheck, AlertCircle } from 'lucide-react';
import { MASTER_USERS } from '../constants';
import { User, UserRole } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [role, setRole] = useState<UserRole>('guru');
  const [id, setId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id.trim()) {
      setError('Mohon masukkan NIP / NIK / ID Anda.');
      return;
    }

    setIsLoading(true);

    // Simulate small latency for premium feels
    setTimeout(() => {
      const trimmedId = id.trim();
      const user = MASTER_USERS.find(
        (u) => u.id.toLowerCase() === trimmedId.toLowerCase() && u.role === role
      );

      if (user) {
        onLoginSuccess(user);
      } else {
        setError('NIP/ID atau Peran yang Anda pilih tidak cocok.');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center relative overflow-hidden">
        {/* Decorative ambient background lights */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/25 relative">
          <ScanFace className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 leading-tight">
          SDK St. Yoseph Kuaputu
        </h1>
        <p className="text-slate-400 mt-2 mb-8 uppercase tracking-widest text-[10px] sm:text-xs font-bold font-sans">
          Sistem Absensi Foto &amp; Laporan
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-sans">
              Pilih Peran Anda
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none font-sans font-medium text-slate-700 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer"
              >
                <option value="guru">🧑‍🏫 Guru Kelas / Mapel</option>
                <option value="kepsek">💼 Kepala Sekolah</option>
                <option value="pegawai">⚙️ Pegawai / TU</option>
                <option value="admin">🔒 Administrator</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-slate-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-sans">
              NIP / NIK / ID User
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Masukkan NIP atau ID (contoh: 101)"
              className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none font-sans font-medium placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3 text-red-600 text-xs font-sans font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4.5 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:shadow-emerald-500/35 active:scale-98 disabled:opacity-50 transition-all duration-300 flex items-center justify-center gap-2 font-sans text-sm cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <span>Masuk Sistem</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-[11px] text-slate-400 font-semibold uppercase tracking-wider font-sans">
          &copy; SDK St. Yoseph Kuaputu • 2026
        </div>
      </div>
    </div>
  );
}
