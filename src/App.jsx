import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import WelcomeScreen from './components/kiosk/WelcomeScreen';
import FrameSelectScreen from './components/kiosk/FrameSelectScreen';
import CameraBoothScreen from './components/kiosk/CameraBoothScreen';
import CustomizeScreen from './components/kiosk/CustomizeScreen';
import ResultScreen from './components/kiosk/ResultScreen';
import PaymentGateScreen from './components/kiosk/PaymentGateScreen';
import AdminDashboard from './components/admin/AdminDashboard';
import { useBooth } from './context/BoothContext';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { printerService } from './services/printerService';

export default function App() {
  const { eventError, activeEvent, isEventLoading } = useBooth();
  const { isAuthenticated, isRestoring } = useAuth();
  const { socket } = useSocket() || {};
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Global socket listener: Allows remote clients (iPad, Admin browser, etc.) to trigger physical silent prints
  useEffect(() => {
    if (!socket) return;
    const handleRemotePrint = (data) => {
      if (data && (data.action === 'PRINT' || data.action === 'PRINT_JOB')) {
        // Only the Electron desktop instance connected to the physical printer executes the print
        if (printerService.isElectron()) {
          console.log('🖨️ Electron host executing remote print job:', data);
          printerService.printPhoto({
            photoUrl: data.photoUrl,
            copies: data.copies || 1,
            source: data.source || 'remote'
          }).catch((err) => {
            console.error('Global silent print execution failed:', err);
          });
        }
      }
    };
    socket.on('kiosk_action', handleRemotePrint);
    return () => socket.off('kiosk_action', handleRemotePrint);
  }, [socket]);

  // If the user lands on a specific screen (e.g., /payment) but the event hasn't loaded yet
  if (isEventLoading && !isAdminRoute) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans flex flex-col">
      {/* Global studio top header */}
      <Header />

      {eventError && !isAdminRoute && (
        <div role="alert" className="w-full px-8 py-3 text-center text-xs font-bold bg-rose-500/15 text-rose-300 border-b border-rose-500/30">
          This event link is not available ({eventError}). Showing the default booth instead.
        </div>
      )}

      {/* Dynamic Screen Transition Switch - situated naturally below header */}
      <main className="w-full flex-1 overflow-hidden flex flex-col min-h-0 relative">
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route path="/frame-select" element={<FrameSelectScreen />} />
          <Route path="/capture" element={<CameraBoothScreen />} />
          <Route path="/customize" element={<CustomizeScreen />} />
          <Route path="/result" element={<ResultScreen />} />
          <Route path="/payment" element={<PaymentGateScreen />} />
          <Route
            path="/admin/*"
            element={!isRestoring && isAuthenticated ? <AdminDashboard /> : (!isRestoring ? <Navigate to="/" /> : null)}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
