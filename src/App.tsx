import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { User, AttendanceRecord, AbsenMode } from './types';
import { GOOGLE_SCRIPT_URL } from './constants';

import LoginView from './components/LoginView';
import GuruDashboard from './components/GuruDashboard';
import AdminPanel from './components/AdminPanel';
import CameraCapture from './components/CameraCapture';
import Loader from './components/Loader';
import SuccessModal from './components/SuccessModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [globalDatabase, setGlobalDatabase] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loaderText, setLoaderText] = useState('Menyiapkan Data...');
  
  // Camera capture modal state
  const [currentMode, setCurrentMode] = useState<AbsenMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Read session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('absen_user_session');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        setCurrentUser(parsed);
      } catch (e) {
        console.error('Failed to parse saved user session:', e);
      }
    }
  }, []);

  // Fetch database whenever currentUser exists
  useEffect(() => {
    if (currentUser) {
      fetchDatabase();
    }
  }, [currentUser]);

  const fetchDatabase = async () => {
    setIsLoading(true);
    setLoaderText('Sinkronisasi Database...');
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setGlobalDatabase(data);
      } else {
        console.warn('Fetched data is not an array:', data);
      }
    } catch (e) {
      console.error('Fetch database error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('absen_user_session', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('absen_user_session');
    setCurrentUser(null);
    setGlobalDatabase([]);
  };

  const handleCapture = async (photoBase64: string) => {
    if (!currentUser || !currentMode) return;

    setIsSubmitting(true);
    setUploadProgress(15);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const localDate = `${yyyy}-${mm}-${dd}`;

    const localTime = now.toLocaleTimeString('id-ID', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    setUploadProgress(45);

    const payload = {
      id_user: String(currentUser.id),
      name: currentUser.name,
      date: localDate,
      time: localTime,
      status: currentMode,
      photo: photoBase64
    };

    setUploadProgress(75);

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.status === 'error') {
        alert("GAGAL MENGIRIM ABSEN: " + result.message);
        setIsSubmitting(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);
      setTimeout(() => {
        setIsSubmitting(false);
        setCurrentMode(null);
        setSuccessMessage(`Absensi ${currentMode} Anda sukses direkam.`);
        setShowSuccessModal(true);
      }, 500);

    } catch (err) {
      console.error(err);
      alert("Gagal mengirim data absensi. Pastikan internet stabil dan coba lagi.");
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleCloseSuccessModal = async () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
    // Refresh database for instant UI synchronization
    await fetchDatabase();
  };

  return (
    <div className="min-h-screen text-slate-800 bg-slate-50 relative antialiased select-none">
      
      {/* GLOBAL LOADER */}
      <AnimatePresence>
        {isLoading && <Loader text={loaderText} />}
      </AnimatePresence>

      {/* LOGIN SCREEN */}
      {!currentUser && (
        <LoginView onLoginSuccess={handleLoginSuccess} />
      )}

      {/* USER DASHBOARD SCREEN (GURU/KEPSEK/PEGAWAI) */}
      {currentUser && currentUser.role !== 'admin' && (
        <GuruDashboard
          user={currentUser}
          database={globalDatabase}
          onTriggerAbsen={(mode) => setCurrentMode(mode)}
          onLogout={handleLogout}
        />
      )}

      {/* ADMINISTRATOR SCREEN */}
      {currentUser && currentUser.role === 'admin' && (
        <AdminPanel
          user={currentUser}
          database={globalDatabase}
          onLogout={handleLogout}
          onRefresh={fetchDatabase}
          showLoader={(text) => {
            setLoaderText(text);
            setIsLoading(true);
          }}
          hideLoader={() => setIsLoading(false)}
        />
      )}

      {/* CAMERA CAPTURE DIALOG */}
      {currentMode && (
        <CameraCapture
          mode={currentMode}
          onCapture={handleCapture}
          onCancel={() => setCurrentMode(null)}
          isSubmitting={isSubmitting}
          uploadProgress={uploadProgress}
        />
      )}

      {/* SUCCESS CONFIRMATION POPUP */}
      <AnimatePresence>
        {showSuccessModal && (
          <SuccessModal
            onClose={handleCloseSuccessModal}
            message={successMessage}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
