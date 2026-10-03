import React, { useState, useEffect, useRef } from 'react';
import { Download, Trash2, Printer, Image as ImageIcon, Clock, QrCode, Share2, Check, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import QRCode from 'qrcode';
import { Modal, Button, Badge } from '../common';
import { useAuth } from '../../context/AuthContext';

export default function SessionGallery() {
  const { authFetch } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [currentShareUrl, setCurrentShareUrl] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [serverPort, setServerPort] = useState(3001);
  const [copiedLink, setCopiedLink] = useState(false);
  const carouselRef = useRef(null);

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    const scrollAmount = direction === 'left' ? -200 : 200;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const data = await authFetch('/api/sessions');
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // Fetch server IP info for network QR codes
    fetch('/api/info')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.ip) {
          setServerIp(data.ip);
          setServerPort(data.port || 3001);
        }
      })
      .catch((err) => console.warn('Could not fetch server network info:', err));
  }, []);

  // Generate QR Code when a session is opened in modal
  useEffect(() => {
    if (!selectedSession) {
      setQrCodeDataUrl('');
      setCurrentShareUrl('');
      return;
    }

    const host = serverIp ? `http://${serverIp}:${serverPort}` : window.location.origin;
    const shareUrl = selectedSession.share_url || `${host}/share/${selectedSession.id}`;
    setCurrentShareUrl(shareUrl);

    QRCode.toDataURL(shareUrl, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#090b10',
        light: '#ffffff'
      }
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [selectedSession, serverIp, serverPort]);

  const handleCopyLink = () => {
    if (!currentShareUrl) return;
    navigator.clipboard.writeText(currentShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Delete this saved photo session?')) return;
    try {
      await authFetch(`/api/sessions/${id}`, { method: 'DELETE' });
      setSessions(sessions.filter((s) => s.id !== id));
      if (selectedSession?.id === id) setSelectedSession(null);
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const handlePrintSession = (compositeUrl) => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <html>
        <head><title>Print Photo Strip</title></head>
        <body style="margin:0;display:flex;align-items:center;justify-content:center;background:#fff;">
          <img src="${compositeUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="flex flex-col gap-2" style={{ padding: '10px' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white">Customer Sessions Gallery</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            View captured photo strips, reprint physical copies, or download high-res files
          </p>
        </div>

        <span className="text-xs sm:text-sm font-bold text-slate-300 bg-slate-900 border border-white/15 px-8 py-4 rounded-full shadow-xl" style={{ padding: '2px' }}>
          {sessions.length} Saved Sessions
        </span>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-slate-400">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-bold">Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl p-10 max-w-md mx-auto shadow-2xl">
          <ImageIcon className="w-14 h-14 text-slate-600 mx-auto mb-4" />
          <h4 className="font-bold text-white text-lg">No photo sessions yet</h4>
          <p className="text-xs text-slate-400 mt-1">
            Complete photo sessions in the Kiosk interface and they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setSelectedSession(session)}
              className="glass-panel rounded-3xl border border-white/15 overflow-hidden cursor-pointer hover:border-pink-500/60 transition-all duration-300 group flex flex-col justify-between shadow-xl hover:scale-105"
            >
              <div className="aspect-[3/4] bg-slate-900 flex items-center justify-center p-4 relative">
                {session.composite_url ? (
                  <img
                    src={session.composite_url}
                    alt={session.frame_name}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300 rounded-xl"
                  />
                ) : (
                  <div className="text-xs text-slate-500">No Image</div>
                )}
              </div>

              <div className="p-4 bg-slate-950/90 border-t border-white/10 space-y-1" style={{ padding: '10px' }}>
                <p className="text-xs sm:text-sm font-bold text-white truncate">{session.frame_name || 'Photo Strip'}</p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-pink-400" />
                  <span>{new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Detail Modal using Reusable Modal Component */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title={selectedSession?.frame_name || 'Photo Session'}
        subtitle={selectedSession ? `${new Date(selectedSession.created_at).toLocaleString()} • Folder: ${selectedSession.id}` : ''}
        maxWidth="max-w-3xl"
        padding="p-5 sm:p-6"
      >
        {selectedSession && (
          <div className="w-full flex flex-col gap-4">
            {/* Top Row: Preview on Left, Compact QR Code on Right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Left Column: Framed Strip Showcase */}
              <div className="md:col-span-7 max-h-[34vh] flex items-center justify-center p-3 bg-slate-950/80 rounded-2xl border border-white/10 shadow-inner w-full"
                style={{ padding: '4px' }}>
                {selectedSession.composite_url ? (
                  <img
                    src={selectedSession.composite_url}
                    alt={selectedSession.frame_name}
                    className="max-h-[30vh] max-w-full object-contain rounded-xl shadow-2xl"
                  />
                ) : (
                  <div className="text-slate-500 text-xs">No preview image</div>
                )}
              </div>

              {/* Right Column: Compact QR Code Scan Card */}
              <div className="md:col-span-5 max-h-[34vh] bg-slate-900/90 rounded-2xl p-4 border border-white/15 shadow-xl flex flex-col items-center text-center gap-2.5"
                style={{ padding: '4px' }}>
                <Badge variant="violet" icon={Sparkles} size="sm">
                  Scan QR Softcopy
                </Badge>

                {qrCodeDataUrl ? (
                  <div className="bg-white p-2 rounded-xl shadow-xl">
                    <img src={qrCodeDataUrl} alt="Scan QR to Download" className="w-28 h-28 object-contain" />
                  </div>
                ) : (
                  <div className="w-28 h-28 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}

                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs sm:text-sm text-white">Scan to Download</h4>
                </div>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1.5 font-bold cursor-pointer transition pt-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Link'}</span>
                </button>
              </div>
            </div>

            {/* Individual Raw Shots Carousel */}
            {selectedSession.photos && selectedSession.photos.length > 0 && (
              <div className="w-full bg-slate-950/60 p-3 rounded-2xl border border-white/10 space-y-2" style={{ padding: '8px' }}>
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <span>Raw Camera Shots</span>
                    <span className="text-[10px] bg-pink-500/20 text-pink-400 font-black px-2 py-0.5 rounded-full border border-pink-500/30">
                      {selectedSession.photos.length} Photos
                    </span>
                  </p>

                  {/* Carousel scroll controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => scrollCarousel('left')}
                      className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition border border-white/10 cursor-pointer"
                      title="Scroll Left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCarousel('right')}
                      className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition border border-white/10 cursor-pointer"
                      title="Scroll Right"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Scroll Carousel */}
                <div
                  ref={carouselRef}
                  className="w-full flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
                  style={{ marginTop: '4px' }}
                >
                  {selectedSession.photos.map((p, idx) => (
                    <a
                      key={idx}
                      href={p}
                      download={`${selectedSession.id}-shot-${idx + 1}.png`}
                      className="group relative flex-shrink-0 w-28 aspect-video bg-slate-900 rounded-xl overflow-hidden border border-white/10 hover:border-pink-500/60 transition block shadow-md"
                      title={`Download Shot #${idx + 1}`}
                    >
                      <img src={p} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                      <span className="absolute top-1 left-1 bg-slate-950/80 text-pink-400 text-[9px] font-black px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Download className="w-4 h-4 text-pink-400" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="w-full flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
              <Button
                variant="danger"
                size="md"
                leftIcon={Trash2}
                onClick={() => handleDeleteSession(selectedSession.id)}
                title="Delete Session & Folder"
              >
                Delete Folder
              </Button>

              <div className="flex flex-wrap gap-3">
                <a
                  href={selectedSession.composite_url}
                  download={`session-${selectedSession.id}-composite.png`}
                  className="inline-flex items-center justify-center font-bold transition-all cursor-pointer px-5 py-2.5 text-xs sm:text-sm rounded-2xl gap-2 bg-slate-800 hover:bg-slate-700 text-white shadow-lg border border-white/10"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Download Strip</span>
                </a>

                <Button
                  variant="primary"
                  size="md"
                  leftIcon={Printer}
                  onClick={() => handlePrintSession(selectedSession.composite_url)}
                >
                  Reprint Strip
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
