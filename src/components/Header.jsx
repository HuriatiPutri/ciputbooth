import React, { useState, useEffect } from 'react';
import { Camera, Volume2, VolumeX, Settings, Video, Eye, LogOut, Maximize, Minimize } from 'lucide-react';
import { useBooth } from '../context/BoothContext';
import { useAuth } from '../context/AuthContext';
import { Modal, Button } from './common';

const INPUT_CLASS =
  'w-full bg-slate-950 border border-white/15 text-white px-6 py-4 rounded-2xl outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20';

export default function Header() {
  const { step, setStep, isMuted, setIsMuted, isMockCamera, setIsMockCamera, settings } = useBooth();
  const { user, isAuthenticated, login, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setPassword('');
    setLoginError('');
  };

  const handleAdminAccess = () => {
    if (isAuthenticated) setStep('admin');
    else setShowLoginModal(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError('');
    try {
      await login(email, password);
      closeLoginModal();
      setStep('admin');
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    setStep('welcome');
  };

  return (
    <>
      <header className="w-full z-40 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between flex-shrink-0 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
        {/* Studio Branding */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 bg-slate-900/90 backdrop-blur-lg px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-full border border-white/15 shadow-xl">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
            <Camera className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
          </div>
          <div>
            <h1 className="font-display font-black tracking-wide text-xs sm:text-base bg-gradient-to-r from-violet-400 via-pink-300 to-amber-200 bg-clip-text text-transparent uppercase truncate max-w-[140px] sm:max-w-none">
              {settings?.studioName || 'CIPUTBOOTH'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mock Camera Toggle */}
          {step === 'booth_capture' && (
            <Button
              variant={isMockCamera ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={Video}
              onClick={() => setIsMockCamera(!isMockCamera)}
              className="rounded-full text-xs py-1.5 px-3 sm:px-4 hidden xs:inline-flex"
            >
              {isMockCamera ? 'Sim Cam' : 'Live Cam'}
            </Button>
          )}

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 sm:p-2.5 rounded-full bg-slate-900/90 backdrop-blur-lg border border-white/15 text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-lg cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />}
          </button>

          {/* Audio Volume Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 sm:p-2.5 rounded-full bg-slate-900/90 backdrop-blur-lg border border-white/15 text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-lg cursor-pointer"
            title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
          </button>

          {/* Admin Switch */}
          {step !== 'admin' ? (
            <button
              onClick={handleAdminAccess}
              className="p-2 sm:p-2.5 rounded-full bg-slate-900/90 backdrop-blur-lg border border-white/15 text-slate-400 hover:text-white hover:bg-slate-800 transition shadow-lg cursor-pointer"
              title="Admin Dashboard"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          ) : (
            <>
              <Button
                variant="primary"
                size="md"
                leftIcon={Eye}
                onClick={() => setStep('welcome')}
                className="rounded-full"
              >
                Exit to Kiosk
              </Button>
              <button
                onClick={handleLogout}
                className="p-4 rounded-full bg-slate-900/90 backdrop-blur-lg border border-white/15 text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition shadow-lg cursor-pointer"
                title={`Sign out${user ? ` (${user.email})` : ''}`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Admin Login Modal */}
      <Modal
        isOpen={showLoginModal}
        onClose={closeLoginModal}
        title="Console Sign In"
        subtitle="Sign in to manage your events and frames"
        icon={Settings}
      >
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-sm mx-auto mb-3">
          <input
            type="email"
            autoFocus
            required
            autoComplete="username"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASS}
          />
          {loginError && (
            <p role="alert" className="text-rose-400 text-xs text-center font-semibold">
              {loginError}
            </p>
          )}
          <div className="flex gap-4 w-full">
            <Button variant="secondary" size="lg" onClick={closeLoginModal} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="flex-1 bg-violet-600 hover:bg-violet-500"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
