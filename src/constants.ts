import { User } from './types';

// PERHATIAN: Google Script URL yang terhubung ke Spreadsheet
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxqlhMHviBkUnn-HtpRBN5-1mfF2zzsR4RlSE-_9nHlcOdHXz2Rc57OEGKcH8igLjtgA/exec";

export const MASTER_USERS: User[] = [
  { id: 'admin', name: 'Admin Sistem', role: 'admin' },
  { id: '111321452', name: 'Wilhelmina Kasih, S.Ag,S.Pd', role: 'kepsek' },
  { id: '196706041991101001', name: 'Ambrosius Sina, S.Pd', role: 'guru' },
  { id: '196904212005012006', name: 'Trifosa Rabe, S.Pd', role: 'guru' },
  { id: '197301152000122002', name: 'Priska Oni, S.Pd', role: 'guru' },
  { id: '197007272000121007', name: 'Flavianus V. Tumpung, S.Pd', role: 'guru' },
  { id: '111321732', name: 'Maria Junista Menge, S.Pd', role: 'guru' },
  { id: '111321555', name: 'Novi Mariana Loinati, S.Pd', role: 'guru' },
  { id: '111321584', name: 'Maria Yunita Lanus, S.Pd', role: 'guru' },
  { id: '111321753', name: 'Yohana Yusarli Nenobesi, S.Pd', role: 'guru' },
  { id: '101', name: 'Stefanus Leli, S.Pd', role: 'guru' },
  { id: '102', name: 'Yohanes Ignasius T. Deku (TU)', role: 'pegawai' }
];
