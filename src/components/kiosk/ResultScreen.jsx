import React, { useEffect, useState } from 'react';
import { Printer, Download, QrCode, Sparkles, RotateCcw, CheckCircle, Share2, Check, Video, Camera, Film } from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { useBooth } from '../../context/BoothContext';
import { soundManager } from '../../utils/audio';
import { Button, Badge, AmbientBackground, GlassCard } from '../common';
import { useSocket } from '../../context/SocketContext';
import LiveFramePreview from './LiveFramePreview';
import { printerService } from '../../services/printerService';

export default function ResultScreen() {
  const {
    compositeUrl,
    liveCompositeUrl,
    selectedFrame,
    capturedPhotos,
    capturedLiveClips,
    filterId,
    stickers,
    customText,
    resetToWelcome,
    savedSessionId,
    savedSessionData,
    isLivePictureEnabled
  } = useBooth();
  const { socket } = useSocket();
  const hasLiveMotion = isLivePictureEnabled && Boolean(
    (capturedLiveClips && capturedLiveClips.length > 0) ||
    liveCompositeUrl ||
    savedSessionData?.live_photo_url ||
    (savedSessionData?.live_clips && savedSessionData.live_clips.length > 0)
  );
  const [activeResultView, setActiveResultView] = useState(hasLiveMotion ? 'live' : 'photo'); // 'photo' | 'live'

  useEffect(() => {
    if (hasLiveMotion) {
      setActiveResultView('live');
    } else {
      setActiveResultView('photo');
    }
  }, [hasLiveMotion]);

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

  // Generate QR Code with proper share URL (Custom Public Domain or Local IP)
  useEffect(() => {
    async function setupQrCode() {
      try {
        const res = await fetch('/api/info');
        const info = await res.json();
        const sid = savedSessionData?.secure_token || savedSessionId || (savedSessionData && savedSessionData.id) || '';

        let targetUrl = savedSessionData?.share_url || '';

        // If a custom public domain is configured on the backend, ensure QR code uses it
        if (info?.public_share_domain) {
          const publicBase = info.public_share_domain.replace(/\/+$/, '');
          if (targetUrl) {
            const tokenOrSid = targetUrl.includes('/share/') ? targetUrl.split('/share/')[1] : sid;
            targetUrl = `${publicBase}/share/${tokenOrSid}`;
          } else if (sid) {
            targetUrl = `${publicBase}/share/${sid}`;
          }
        } else if (targetUrl && targetUrl.startsWith('/')) {
          const portToUse = info.http_port || 3002;
          const localHost = info.ip ? `http://${info.ip}:${portToUse}` : window.location.origin;
          targetUrl = `${localHost}${targetUrl}`;
        } else if (!targetUrl) {
          const portToUse = info.http_port || 3002;
          const localHost = info.ip ? `http://${info.ip}:${portToUse}` : window.location.origin;
          targetUrl = sid ? `${localHost}/share/${sid}` : `${localHost}/uploads/sessions/latest.png`;
        }

        if (!targetUrl) {
          targetUrl = `${window.location.origin}/share/${sid}`;
        }

        setCurrentShareUrl(targetUrl);

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

  // Check if device is remote (via query param OR touch/iPad mobile device)
  const isTouchMobileOrRemote = () => {
    const isParamRemote = new URLSearchParams(window.location.search).get('mode') === 'remote';
    const isMobileDevice = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isNonLocalhost = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return isParamRemote || (isMobileDevice && isNonLocalhost);
  };

  // Listen for remote print commands
  useEffect(() => {
    if (!socket) return;
    const handleAction = (data) => {
      console.log('🖨️ Received kiosk_action on client:', data);
      if (data && (data.action === 'PRINT' || data.action === 'PRINT_JOB')) {
        // Laptop/desktop display executes automatic silent print
        if (!isTouchMobileOrRemote()) {
          console.log('🖨️ Display executing automatic silent print...');
          executePrint(data.photoUrl, data.copies);
        } else {
          console.log('📱 Remote client received echo - ignoring local print execution');
        }
      }
    };
    socket.on('kiosk_action', handleAction);
    return () => socket.off('kiosk_action', handleAction);
  }, [socket, compositeUrl, savedSessionData]);

  const executePrint = async (customUrl = null, customCopies = null) => {
    const targetImgUrl = customUrl || compositeUrl || savedSessionData?.download_url || savedSessionData?.composite_url;
    if (!targetImgUrl) {
      console.warn('No photo strip URL available to print');
      return;
    }

    if (isPrinting) {
      console.warn('Print already in progress');
      return;
    }

    setIsPrinting(true);
    console.log('🖨️ Sending silent print job to default printer...');

    try {
      const copiesToPrint = customCopies || (selectedFrame?.print_size === '2x6' ? 2 : 1);
      const res = await printerService.printPhoto({
        photoUrl: targetImgUrl,
        copies: copiesToPrint,
        source: 'customer'
      });

      console.log('Print result:', res);
    } catch (err) {
      console.error('Silent print failed:', err);
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
      }, 3000);
    }
  };

  // Handle printer action
  const handlePrint = () => {
    soundManager.playClick();
    if (isPrinting) return;

    const isRemote = isTouchMobileOrRemote();
    if (isRemote) {
      // Command the main laptop/booth display to print!
      setIsPrinting(true);
      console.log('📱 Sending remote_action PRINT to laptop...');
      const targetImgUrl = compositeUrl || savedSessionData?.download_url || savedSessionData?.composite_url;
      const copiesToPrint = selectedFrame?.print_size === '2x6' ? 2 : 1;

      socket?.emit('remote_action', {
        action: 'PRINT_JOB',
        photoUrl: targetImgUrl,
        copies: copiesToPrint
      });

      // Also trigger backend print dispatch as backup
      printerService.printPhoto({
        photoUrl: targetImgUrl,
        copies: copiesToPrint,
        source: 'customer'
      }).catch((e) => console.warn('Remote printer service trigger notice:', e));

      setTimeout(() => {
        setIsPrinting(false);
      }, 4000);
    } else {
      executePrint();
    }
  };

  // Direct file download (Framed strip PNG)
  const handleDownloadStrip = () => {
    soundManager.playClick();
    if (!compositeUrl) return;
    const link = document.createElement('a');
    link.href = compositeUrl;
    link.download = `ciputbooth-${Date.now()}-framed.png`;
    link.click();
  };

  // Direct file download (Live Picture Video)
  const handleDownloadLiveVideo = () => {
    soundManager.playClick();
    const liveUrl = liveCompositeUrl || savedSessionData?.download_live_url || savedSessionData?.live_photo_url;
    if (!liveUrl) return;
    const isMp4 = liveUrl.startsWith('data:video/mp4') || liveUrl.toLowerCase().endsWith('.mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const link = document.createElement('a');
    link.href = liveUrl;
    link.download = `ciputbooth-${Date.now()}-live.${ext}`;
    link.click();
  };

  // Download all files: framed composite + live video + shots + clips
  const handleDownloadAll = () => {
    soundManager.playClick();
    const filesToDownload = [];
    if (compositeUrl) {
      filesToDownload.push({ url: compositeUrl, name: `ciputbooth-${Date.now()}-framed.png` });
    }
    const liveUrl = isLivePictureEnabled ? (liveCompositeUrl || savedSessionData?.download_live_url || savedSessionData?.live_photo_url) : null;
    if (liveUrl) {
      const isMp4 = liveUrl.startsWith('data:video/mp4') || liveUrl.toLowerCase().endsWith('.mp4');
      const ext = isMp4 ? 'mp4' : 'webm';
      filesToDownload.push({ url: liveUrl, name: `ciputbooth-${Date.now()}-live.${ext}` });
    }
    if (savedSessionData?.gif_url) {
      filesToDownload.push({ url: savedSessionData.gif_url, name: `ciputbooth-${Date.now()}-animation.gif` });
    }
    if (Array.isArray(capturedPhotos)) {
      capturedPhotos.forEach((photo, idx) => {
        if (photo) {
          filesToDownload.push({ url: photo, name: `ciputbooth-${Date.now()}-shot-${idx + 1}.png` });
        }
      });
    }
    if (isLivePictureEnabled && Array.isArray(capturedLiveClips)) {
      capturedLiveClips.forEach((clip, idx) => {
        if (clip) {
          const isMp4 = clip.startsWith('data:video/mp4') || clip.toLowerCase().endsWith('.mp4');
          const ext = isMp4 ? 'mp4' : 'webm';
          filesToDownload.push({ url: clip, name: `ciputbooth-${Date.now()}-live-clip-${idx + 1}.${ext}` });
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
    <div className="relative w-full h-full flex flex-col justify-between p-3 sm:p-5 lg:p-6 overflow-hidden bg-slate-950">
      {/* Hidden container on screen, strictly formatted for standard photo printers */}
      <div id="printable-photo-strip" className="hidden print:flex">
        {(compositeUrl || savedSessionData?.download_url || savedSessionData?.composite_url) && (
          <img
            src={compositeUrl || savedSessionData?.download_url || savedSessionData?.composite_url}
            alt="Printable Photo Strip"
          />
        )}
      </div>

      {/* Background glow */}
      <AmbientBackground primaryColor="bg-pink-600/15" secondaryColor="bg-violet-600/15" />

      {/* Top Header */}
      <div className="mx-auto w-full flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg sm:text-2xl text-white">Your Photos Are Ready!</h2>
            <p className="text-slate-400 text-[11px] sm:text-xs">Print your strip or scan the QR code to save photos and videos</p>
          </div>
        </div>

        {/* Auto reset badge */}
        <Button variant="outline" size="sm" className="text-xs py-1 px-3">
          <span>Auto-reset: </span>
          <span className="font-mono font-black text-pink-400 ml-1">{autoResetTimer}s</span>
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl w-full mx-auto z-10 grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4 xl:gap-5 items-center flex-1 py-1.5 min-h-0 my-auto">
        {/* Left: Printed Strip Showcase */}
        <div className="xl:col-span-6 h-full max-h-[48vh] sm:max-h-[50vh] xl:max-h-full flex flex-col items-center justify-center min-h-0 gap-1.5">
          {/* Mode Switcher Pill - Only shown when live motion is enabled and available */}
          {hasLiveMotion && (
            <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-white/20 shadow-xl flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveResultView('photo')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeResultView === 'photo'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Photo Strip</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveResultView('live')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeResultView === 'live'
                    ? 'bg-gradient-to-r from-violet-600 via-pink-500 to-amber-400 text-white shadow-lg shadow-violet-500/30 ring-1 ring-white/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>Live Picture ✨</span>
              </button>
            </div>
          )}

          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden glass-panel border border-white/20 p-2 sm:p-3 shadow-2xl bg-slate-950/95 flex-1 w-full flex items-center justify-center min-h-0">
            {hasLiveMotion && activeResultView === 'live' ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <LiveFramePreview
                  frame={selectedFrame}
                  photos={capturedPhotos}
                  liveClips={capturedLiveClips?.length > 0 ? capturedLiveClips : (savedSessionData?.live_clips || [])}
                  filterId={filterId}
                  stickers={stickers}
                  customText={customText}
                  isLive={true}
                  className="h-full w-auto max-w-full"
                />
                <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold shadow-lg border border-violet-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Live Motion</span>
                </div>
              </div>
            ) : compositeUrl ? (
              <img
                src={compositeUrl}
                alt="Final Composite Strip"
                className="h-full w-auto max-w-full object-contain rounded-xl sm:rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="w-48 h-60 flex items-center justify-center text-slate-500">
                <p className="text-xs font-bold">Generating final strip...</p>
              </div>
            )}

            {/* Print animation badge */}
            {isPrinting && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-20 p-6 rounded-2xl sm:rounded-3xl">
                <Printer className="w-12 h-12 text-pink-400 animate-bounce mb-2" />
                <h4 className="font-display font-black text-lg">Sending to Printer...</h4>
                <p className="text-slate-400 text-xs">Printing in progress</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions & Digital QR Code */}
        <div className="xl:col-span-6 flex flex-col gap-2.5 sm:gap-3.5 glass-panel rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-white/20 shadow-2xl min-h-0 justify-between">
          {/* Action 1: Print Strip Button */}
          <Button
            variant="primary"
            size="lg"
            leftIcon={Printer}
            onClick={handlePrint}
            disabled={isPrinting}
            className="w-full py-3 sm:py-3.5 text-sm sm:text-base font-black shadow-xl flex-shrink-0"
          >
            {isPrinting
              ? '🖨️ SENDING TO PRINTER...'
              : isTouchMobileOrRemote()
              ? '🖨️ SEND TO LAPTOP PRINTER'
              : 'PRINT PHOTO STRIP NOW'}
          </Button>

          {/* Action 2: Digital QR Code Card */}
          <div className="bg-slate-900/90 rounded-2xl p-3 sm:p-4 border border-white/15 flex items-center gap-3.5 shadow-inner">
            {qrCodeDataUrl ? (
              <div className="bg-white p-1.5 rounded-xl shadow-lg flex-shrink-0">
                <img src={qrCodeDataUrl} alt="Scan QR for Digital Copy" className="w-16 h-16 sm:w-20 sm:h-20" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
                <QrCode className="w-8 h-8" />
              </div>
            )}

            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <Badge variant="violet" icon={Sparkles} size="sm" className="text-[10px] py-0.5 px-2">
                {hasLiveMotion ? 'HD Softcopy & Video' : 'HD Softcopy'}
              </Badge>
              <h4 className="font-bold text-xs sm:text-sm text-white">Scan with Phone</h4>
              <p className="text-slate-400 text-[11px] leading-tight line-clamp-2">
                {hasLiveMotion
                  ? 'Scan with camera to download photo strip & live video directly to your phone.'
                  : 'Scan with camera to download your photo strip directly to your phone.'}
              </p>
              <div className="flex items-center gap-3 pt-0.5">
                <button
                  onClick={handleCopyLink}
                  className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 font-bold cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
                {currentShareUrl && (
                  <a
                    href={currentShareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-slate-400 hover:text-blue-300 underline truncate max-w-[150px]"
                    title="Buka link di browser"
                  >
                    Buka Link
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action 3: Download & Start Over Buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className={`grid ${hasLiveMotion ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Download}
                onClick={handleDownloadStrip}
                className="w-full text-xs py-2"
              >
                Download Photo
              </Button>

              {hasLiveMotion && (
                <button
                  type="button"
                  onClick={handleDownloadLiveVideo}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 text-white shadow hover:brightness-110 active:scale-95 transition cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Live Video</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Download}
                onClick={handleDownloadAll}
                className="w-full text-[11px] py-2"
              >
                Download All
              </Button>

              <Button
                variant="outline"
                size="sm"
                leftIcon={RotateCcw}
                onClick={resetToWelcome}
                className="w-full text-xs py-2"
              >
                Start New Session
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
