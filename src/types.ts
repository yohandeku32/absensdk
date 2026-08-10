export type UserRole = 'admin' | 'kepsek' | 'guru' | 'pegawai';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface AttendanceRecord {
  id_user: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // "HH:MM" or "HH:MM - HH:MM"
  status: 'MASUK' | 'PULANG' | 'MASUK & PULANG';
  photo?: string; // base64 representation
}

export type AbsenMode = 'MASUK' | 'PULANG';
