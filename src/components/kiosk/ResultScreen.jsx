import React, { useEffect, useState } from 'react';
import { Printer, Download, QrCode, Sparkles, RotateCcw, CheckCircle, Share2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { useBooth } from '../../context/BoothContext';
import { soundManager } from '../../utils/audio';
import { Button, Badge, AmbientBackground, GlassCard } from '../common';
import { useSocket } from '../../context/SocketContext';

export default function ResultScreen() {
  const { compositeUrl, capturedPhotos, resetToWelcome, savedSessionId, savedSessionData } = useBooth();
  const { socket } = useSocket();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [currentShareUrl, setCurrentShareUrl] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [autoResetTimer, setAutoResetTimer] = useState(100);

  // Trigger confetti burst on load
  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  }, []);

  // Safe auto reset countdown (90 seconds, no side-effects in state updater)
  useEffect(() => {
    if (autoResetTimer <= 0) {
      resetToWelcome();
      return;
    }

    const timerId = setInterval(() => {
      setAutoResetTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timerId);
  }, [autoResetTimer, resetToWelcome]);

  // Generate QR Code with proper share URL (Local IP / Server mobile download endpoint)
  useEffect(() => {
    async function setupQrCode() {
      let targetUrl = savedSessionData?.share_url;

      if (!targetUrl) {
        try {
          const res = await fetch('/api/info');
          const info = await res.json();
          if (info.success && info.ip) {
            const sid = savedSessionId || (savedSessionData && savedSessionData.id) || '';
            targetUrl = sid ? `http://${info.ip}:${info.port}/share/${sid}` : `http://${info.ip}:${info.port}/uploads/sessions/latest.png`;
          }
        } catch (e) {
          console.warn('Could not fetch server network info:', e);
        }
      }

      if (!targetUrl) {
        targetUrl = `${window.location.origin}/share/${savedSessionId || ''}`;
      }

      setCurrentShareUrl(targetUrl);

      try {
        const qr = await QRCode.toDataURL(targetUrl, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#090b10',
            light: '#ffffff'
          }
        });
        setQrCodeDataUrl(qr);
      } catch (err) {
        console.error('QR code generation error:', err);
      }
    }

    setupQrCode();
  }, [savedSessionData, savedSessionId]);

  // Listen for remote print commands
  useEffect(() => {
    if (!socket) return;
    const handleAction = (data) => {
      if (data.action === 'PRINT') {
        executePrint();
      }
    };
    socket.on('kiosk_action', handleAction);
    return () => socket.off('kiosk_action', handleAction);
  }, [socket]);

  const executePrint = () => {
    if (isPrinting) return;
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 800);
  };

  // Handle printer action
  const handlePrint = () => {
    soundManager.playClick();
    const isRemote = new URLSearchParams(window.location.search).get('mode') === 'remote';
    if (isRemote) {
      // Command the main display to print
      socket?.emit('remote_action', { action: 'PRINT' });
    } else {
      executePrint();
    }
  };

  // Direct file download (Framed strip)
  const handleDownloadStrip = () => {
    soundManager.playClick();
    if (!compositeUrl) return;
    const link = document.createElement('a');
    link.href = compositeUrl;
    link.download = `ciputbooth-${Date.now()}-framed.png`;
    link.click();
  };

  // Download all files: framed composite + all individual shots
  const handleDownloadAll = () => {
    soundManager.playClick();
    const filesToDownload = [];
    if (compositeUrl) {
      filesToDownload.push({ url: compositeUrl, name: `ciputbooth-${Date.now()}-framed.png` });
    }
    if (Array.isArray(capturedPhotos)) {
      capturedPhotos.forEach((photo, idx) => {
        if (photo) {
          filesToDownload.push({ url: photo, name: `ciputbooth-${Date.now()}-shot-${idx + 1}.png` });
        }
      });
    }

    filesToDownload.forEach((file, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 300);
    });
  };

  // Copy direct link
  const handleCopyLink = () => {
    soundManager.playClick();
    const shareUrl = currentShareUrl || window.location.href;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="relative w-full h-screen flex flex-col justify-between py-3 px-6 sm:px-12 overflow-hidden bg-slate-950">
      {/* Hidden container formatted strictly for standard photo printers */}
      <div id="printable-photo-strip" className="hidden">
        {compositeUrl && <img src={compositeUrl} alt="Printable Photo Strip" />}
      </div>

      {/* Background glow */}
      <AmbientBackground primaryColor="bg-pink-600/15" secondaryColor="bg-violet-600/15" />

      {/* Top Header */}
      <div className="mx-auto w-full flex items-center justify-between z-10 flex-shrink-0" style={{ padding: '10px' }}>
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-xl sm:text-2xl lg:text-3xl text-white">Your Photos Are Ready!</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Print your physical strip or scan the QR code to save to phone</p>
          </div>
        </div>

        {/* Auto reset badge */}
        <Button variant='outline'>
          <span>Auto-reset in </span>
          <span className="font-mono font-black text-pink-400 text-base">{autoResetTimer}s</span>
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl w-full mx-auto my-auto z-10 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center px-2 sm:px-4 flex-1 py-2 min-h-0">
        {/* Left: Printed Strip Showcase (Full height top to bottom) */}
        <div className="md:col-span-7 h-full flex flex-col items-center justify-center min-h-0">
          <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/20 p-2 sm:p-3 shadow-2xl bg-slate-950/95 h-[80vh] w-full flex items-center justify-center transform hover:scale-[1.01] transition">
            {compositeUrl ? (
              <img
                src={compositeUrl}
                alt="Final Composite Strip"
                className="h-full w-auto max-w-full object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="w-64 h-80 flex items-center justify-center text-slate-500">
                <p className="text-xs font-bold">Generating final strip...</p>
              </div>
            )}

            {/* Print animation badge */}
            {isPrinting && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-20 p-8 rounded-3xl">
                <Printer className="w-16 h-16 text-pink-400 animate-bounce mb-4" />
                <h4 className="font-display font-black text-2xl">Sending to Printer...</h4>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">Epson EcoTank / Thermal Dye-Sub Ready</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions & Digital QR Code */}
        <div className="md:col-span-5 flex flex-col gap-6 glass-panel rounded-3xl p-8 border border-white/20 shadow-2xl">
          {/* Action 1: Print Strip Button */}
          <Button
            variant="primary"
            size="xl"
            leftIcon={Printer}
            onClick={handlePrint}
            className="w-full"
          >
            PRINT PHOTO STRIP NOW
          </Button>

          {/* Action 2: Digital QR Code Card */}
          <div className="bg-slate-900/90 rounded-3xl p-8 border border-white/15 flex items-center gap-6 shadow-inner">
            {qrCodeDataUrl ? (
              <div className="bg-white p-3 rounded-2xl shadow-lg flex-shrink-0">
                <img src={qrCodeDataUrl} alt="Scan QR for Digital Copy" className="w-26 h-26 sm:w-30 sm:h-30" />
              </div>
            ) : (
              <div className="w-26 h-26 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500">
                <QrCode className="w-12 h-12" />
              </div>
            )}

            <div className="flex-1 text-left space-y-2">
              <Badge variant="violet" icon={Sparkles} size="sm">
                Digital Softcopy
              </Badge>
              <h4 className="font-bold text-base sm:text-lg text-white">Scan with Phone</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Scan with your phone camera to download the HD photo strip instantly.
              </p>
              <button
                onClick={handleCopyLink}
                className="text-xs sm:text-sm text-pink-400 hover:text-pink-300 flex items-center gap-2 font-bold cursor-pointer pt-1"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Link'}</span>
              </button>
            </div>
          </div>

          {/* Action 3: Download & Start Over Buttons */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="md"
                leftIcon={Download}
                onClick={handleDownloadStrip}
                className="w-full"
              >
                Download Framed Strip
              </Button>

              <Button
                variant="secondary"
                size="md"
                leftIcon={Download}
                onClick={handleDownloadAll}
                className="w-full"
              >
                Download All ({(capturedPhotos?.length || 0) + 1} Files)
              </Button>
            </div>

            <Button
              variant="outline"
              size="md"
              leftIcon={RotateCcw}
              onClick={resetToWelcome}
              className="w-full"
            >
              Start New Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
