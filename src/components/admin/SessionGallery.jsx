import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Download, 
  Trash2, 
  Printer, 
  Image as ImageIcon, 
  Clock, 
  QrCode, 
  Share2, 
  Check, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudOff,
  RefreshCw,
  Lock,
  ShieldOff,
  ExternalLink,
  CalendarDays,
  Search,
  Filter,
  FolderOpen,
  Layers,
  ArrowLeft
} from 'lucide-react';
import QRCode from 'qrcode';
import { Modal, Button, Badge } from '../common';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { printerService } from '../../services/printerService';

export default function SessionGallery() {
  const { authFetch } = useAuth();
  const { socket } = useSocket() || {};
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedEvents, setCollapsedEvents] = useState({});
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [currentShareUrl, setCurrentShareUrl] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [serverPort, setServerPort] = useState(3001);
  const [publicShareDomain, setPublicShareDomain] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isReprinting, setIsReprinting] = useState(false);
  const [reprintStatus, setReprintStatus] = useState(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [shareActionStatus, setShareActionStatus] = useState(null);
  const carouselRef = useRef(null);

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    const scrollAmount = direction === 'left' ? -200 : 200;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const [sessionsData, eventsData] = await Promise.all([
        authFetch('/api/sessions').catch((e) => {
          console.error('Error fetching sessions:', e);
          return [];
        }),
        authFetch('/api/events').catch((e) => {
          console.error('Error fetching events:', e);
          return [];
        })
      ]);
      setSessions(sessionsData || []);
      setEvents(eventsData || []);
    } catch (err) {
      console.error('Error loading gallery data:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);

    // Fetch server IP info for network QR codes
    fetch('/api/info')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.ip) setServerIp(data.ip);
          if (data.http_port || data.port) setServerPort(data.http_port || 3002);
          if (data.public_share_domain) setPublicShareDomain(data.public_share_domain);
        }
      })
      .catch((err) => console.warn('Could not fetch server network info:', err));

    // Fallback polling every 6s so gallery stays synced even if socket disconnects
    const pollInterval = setInterval(() => {
      loadData(false);
    }, 6000);

    return () => clearInterval(pollInterval);
  }, []);

  // Real-time socket listener for new customer captures and deletions
  useEffect(() => {
    if (!socket) return;

    const handleNewSession = (newSession) => {
      console.log('⚡ Real-time new session received in gallery:', newSession);
      if (!newSession) return;
      setSessions((prev) => {
        const id = String(newSession.id || newSession._id);
        const exists = prev.some((s) => String(s.id || s._id) === id);
        if (exists) return prev;
        return [newSession, ...prev];
      });
    };

    const handleDeleteSession = ({ id }) => {
      console.log('⚡ Real-time session deleted in gallery:', id);
      if (!id) return;
      setSessions((prev) => prev.filter((s) => String(s.id || s._id) !== String(id)));
      setSelectedSession((curr) => (curr && String(curr.id || curr._id) === String(id) ? null : curr));
    };

    socket.on('new_session', handleNewSession);
    socket.on('delete_session', handleDeleteSession);

    return () => {
      socket.off('new_session', handleNewSession);
      socket.off('delete_session', handleDeleteSession);
    };
  }, [socket]);

  // Generate QR Code when a session is opened in modal
  useEffect(() => {
    if (!selectedSession) {
      setQrCodeDataUrl('');
      setCurrentShareUrl('');
      return;
    }

    let shareUrl = selectedSession.share_url;
    if (publicShareDomain) {
      const tokenOrId = shareUrl && shareUrl.includes('/share/')
        ? shareUrl.split('/share/')[1]
        : (selectedSession.secure_token || selectedSession.id);
      shareUrl = `${publicShareDomain.replace(/\/+$/, '')}/share/${tokenOrId}`;
    } else if (!shareUrl) {
      const host = serverIp ? `http://${serverIp}:${serverPort}` : window.location.origin;
      shareUrl = `${host}/share/${selectedSession.secure_token || selectedSession.id}`;
    }
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
  }, [selectedSession, serverIp, serverPort, publicShareDomain]);

  const handleCopyLink = () => {
    if (!currentShareUrl) return;
    navigator.clipboard.writeText(currentShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRegenerateToken = async (sessionId) => {
    try {
      const res = await authFetch(`/api/drive/regenerate-token/${sessionId}`, { method: 'POST' });
      if (res?.success) {
        setSelectedSession((prev) => ({
          ...prev,
          share_url: res.shareUrl,
          secure_token: res.rawToken,
          token_expires_at: res.expiresAt
        }));
        setShareActionStatus('Fresh QR Code & Token generated!');
        setTimeout(() => setShareActionStatus(null), 3000);
      }
    } catch (e) {
      console.error(e);
      setShareActionStatus('Error regenerating token: ' + e.message);
      setTimeout(() => setShareActionStatus(null), 3500);
    }
  };

  const handleRevokeToken = async (sessionId) => {
    if (!window.confirm('Revoke customer access? The current QR code will immediately stop working.')) return;
    try {
      const res = await authFetch(`/api/drive/revoke-token/${sessionId}`, { method: 'POST' });
      if (res?.success) {
        setShareActionStatus('Access revoked. QR code link is now disabled.');
        setTimeout(() => setShareActionStatus(null), 3500);
      }
    } catch (e) {
      console.error(e);
      setShareActionStatus('Error revoking token: ' + e.message);
      setTimeout(() => setShareActionStatus(null), 3500);
    }
  };

  const handleRetryDriveUpload = async (sessionId) => {
    try {
      setIsSyncingDrive(true);
      setShareActionStatus(null);
      const res = await authFetch(`/api/drive/retry-upload/${sessionId}`, { method: 'POST' });
      if (res?.success) {
        setSelectedSession((prev) => ({ ...prev, drive_upload_status: 'success' }));
        loadData(false);
        setShareActionStatus('Session uploaded to Google Drive successfully!');
      } else {
        setShareActionStatus('Google Drive sync failed: ' + (res?.error || 'Check Drive credentials in Settings'));
      }
    } catch (e) {
      setShareActionStatus('Upload error: ' + e.message);
    } finally {
      setIsSyncingDrive(false);
      setTimeout(() => setShareActionStatus(null), 4000);
    }
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

  const handlePrintSession = async (compositeUrl) => {
    if (!compositeUrl || isReprinting) return;

    setIsReprinting(true);
    setReprintStatus(null);
    try {
      const res = await printerService.printPhoto({
        photoUrl: compositeUrl,
        copies: 1,
        source: 'admin'
      });
      if (res?.success !== false) {
        setReprintStatus('Reprint dispatched to default printer!');
        setTimeout(() => setReprintStatus(null), 3000);
      } else {
        setReprintStatus('Print error: ' + (res?.message || 'Failed'));
        setTimeout(() => setReprintStatus(null), 4000);
      }
    } catch (err) {
      console.error('Reprint error:', err);
      setReprintStatus('Failed to reprint: ' + err.message);
      setTimeout(() => setReprintStatus(null), 4000);
    } finally {
      setIsReprinting(false);
    }
  };

  const toggleEventCollapse = (eventId) => {
    setCollapsedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  // Group sessions by event
  const { eventGroups, allEventOptions, totalSessionsCount } = useMemo(() => {
    const eventMap = new Map();
    (events || []).forEach((ev) => {
      eventMap.set(String(ev.id || ev._id), ev);
    });

    const buckets = {};
    const normalizedQuery = searchQuery.trim().toLowerCase();

    // Group all fetched sessions
    (sessions || []).forEach((s) => {
      // Query filter
      if (normalizedQuery) {
        const frameMatch = (s.frame_name || '').toLowerCase().includes(normalizedQuery);
        const idMatch = String(s.id || '').toLowerCase().includes(normalizedQuery);
        const eventMatch = (s.event_name || '').toLowerCase().includes(normalizedQuery);
        if (!frameMatch && !idMatch && !eventMatch) return;
      }

      const rawEventId = s.event_id || 'default_event';
      const evId = String(rawEventId);
      if (!buckets[evId]) {
        const matchedEv = eventMap.get(evId);
        buckets[evId] = {
          id: evId,
          name: s.event_name || matchedEv?.event_name || (evId === 'default_event' ? 'Sesi Umum / Default' : `Event ${evId.slice(-6)}`),
          eventDetails: matchedEv || null,
          sessions: []
        };
      }
      buckets[evId].sessions.push(s);
    });

    // Also include configured events that have 0 sessions yet so the user can easily see their status
    (events || []).forEach((ev) => {
      const evId = String(ev.id || ev._id);
      if (!buckets[evId]) {
        buckets[evId] = {
          id: evId,
          name: ev.event_name,
          eventDetails: ev,
          sessions: []
        };
      }
    });

    // Build filter tab options
    const options = [
      { id: 'all', name: 'Semua Event', count: sessions.length }
    ];

    Object.values(buckets).forEach((b) => {
      options.push({
        id: b.id,
        name: b.name,
        count: b.sessions.length
      });
    });

    // Sort buckets: events with sessions first (by latest capture), then empty events
    let sortedGroups = Object.values(buckets).sort((a, b) => {
      if (a.sessions.length > 0 && b.sessions.length === 0) return -1;
      if (a.sessions.length === 0 && b.sessions.length > 0) return 1;
      const dateA = a.sessions[0] ? new Date(a.sessions[0].created_at).getTime() : 0;
      const dateB = b.sessions[0] ? new Date(b.sessions[0].created_at).getTime() : 0;
      return dateB - dateA;
    });

    // Filter by selected event if not 'all'
    if (selectedEventId !== 'all') {
      sortedGroups = sortedGroups.filter((g) => g.id === selectedEventId);
    }

    const totalCount = sortedGroups.reduce((acc, g) => acc + g.sessions.length, 0);

    return {
      eventGroups: sortedGroups,
      allEventOptions: options,
      totalSessionsCount: totalCount
    };
  }, [sessions, events, searchQuery, selectedEventId]);

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white">Customer Captures Gallery</h2>
            <Badge variant="violet" size="sm" icon={CalendarDays}>
              Dikelompokkan per Event
            </Badge>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Galeri foto customer yang terorganisir per event. Cetak ulang, unduh resolusi tinggi, atau kelola privasi token QR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-bold text-slate-300 bg-slate-900 border border-white/15 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            <span>{sessions.length} Total Sesi Tersimpan</span>
          </span>
          <span className="text-xs sm:text-sm font-bold text-pink-300 bg-pink-500/10 border border-pink-500/20 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-pink-400" />
            <span>{events.length} Event Terdaftar</span>
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-3xl border border-white/10 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari frame, ID sesi, atau nama event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-white/15 text-white pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Event Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5 text-violet-400" />
            <span>Event:</span>
          </span>
          {allEventOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedEventId(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 border ${
                selectedEventId === opt.id
                  ? 'bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border-white/10 hover:border-white/20'
              }`}
            >
              <span>{opt.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                selectedEventId === opt.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-400">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-bold">Memuat sesi foto...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl p-10 max-w-md mx-auto shadow-2xl">
          <ImageIcon className="w-14 h-14 text-slate-600 mx-auto mb-4" />
          <h4 className="font-bold text-white text-lg">Belum Ada Sesi Foto</h4>
          <p className="text-xs text-slate-400 mt-1">
            Selesaikan sesi foto di interface Kiosk dan hasilnya akan muncul secara otomatis di sini sesuai event yang berjalan.
          </p>
        </div>
      ) : eventGroups.length === 0 ? (
        <div className="py-16 text-center glass-panel rounded-3xl p-8 max-w-md mx-auto">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="font-bold text-white text-base">Tidak ada hasil yang cocok</h4>
          <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter event.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setSearchQuery(''); setSelectedEventId('all'); }}
            className="mt-4"
          >
            Reset Filter
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Breadcrumb if filtered by single event */}
          {selectedEventId !== 'all' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedEventId('all')}
                className="text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1.5 cursor-pointer bg-slate-900 border border-white/10 px-3 py-1.5 rounded-xl transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lihat Semua Event</span>
              </button>
            </div>
          )}

          {/* Render each event group */}
          {eventGroups.map((group) => {
            const isCollapsed = collapsedEvents[group.id] || false;
            const eventDetails = group.eventDetails;

            return (
              <div
                key={group.id}
                className="glass-panel rounded-3xl border border-white/15 overflow-hidden shadow-2xl transition duration-200"
              >
                {/* Event Group Header Bar */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/80 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/20 flex-shrink-0">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-display font-black text-lg sm:text-xl text-white">
                          {group.name}
                        </h3>
                        <Badge variant="violet" size="sm">
                          {group.sessions.length} Foto
                        </Badge>
                        {eventDetails?.payment_type && (
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            eventDetails.payment_type === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          }`}>
                            {eventDetails.payment_type === 'paid'
                              ? `Berbayar (Rp ${Number(eventDetails.price_per_photo || 0).toLocaleString('id-ID')})`
                              : 'Gratis'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {group.id === 'default_event'
                          ? 'Sesi yang diambil tanpa parameter event khusus'
                          : `ID Event: ${group.id}`}
                      </p>
                    </div>
                  </div>

                  {/* Header Quick Controls */}
                  <div className="flex items-center gap-2">
                    {selectedEventId === 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedEventId(group.id)}
                        className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-white/10 px-3 py-1.5 rounded-xl transition cursor-pointer"
                        title="Tampilkan hanya event ini"
                      >
                        Fokus Event
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleEventCollapse(group.id)}
                      className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition border border-white/10 cursor-pointer"
                      title={isCollapsed ? 'Buka galeri event' : 'Tutup galeri event'}
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Event Photo Grid */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-6">
                    {group.sessions.length === 0 ? (
                      <div className="py-10 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-semibold">Belum ada sesi foto untuk event ini</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">Gunakan link Kiosk event ini untuk mulai mengambil foto.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                        {group.sessions.map((session) => (
                          <div
                            key={session.id}
                            onClick={() => setSelectedSession(session)}
                            className="glass-panel rounded-2xl border border-white/15 overflow-hidden cursor-pointer hover:border-pink-500/60 transition-all duration-300 group flex flex-col justify-between shadow-xl hover:scale-105"
                          >
                            <div className="aspect-[3/4] bg-slate-900 flex items-center justify-center p-3 relative">
                              {session.composite_url ? (
                                <img
                                  src={session.composite_url}
                                  alt={session.frame_name}
                                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300 rounded-xl"
                                />
                              ) : (
                                <div className="text-xs text-slate-500">No Image</div>
                              )}

                              {session.drive_upload_status === 'success' && (
                                <span
                                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg backdrop-blur-sm"
                                  title="Backed up to Private Google Drive"
                                >
                                  <Cloud className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>

                            <div className="p-3 bg-slate-950/90 border-t border-white/10 space-y-1">
                              <p className="text-xs font-bold text-white truncate" title={session.frame_name}>
                                {session.frame_name || 'Photo Strip'}
                              </p>
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-pink-400" />
                                  <span>{new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(session.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Session Detail Modal using Reusable Modal Component */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title={selectedSession?.frame_name || 'Photo Session'}
        subtitle={selectedSession ? `${new Date(selectedSession.created_at).toLocaleString()} • Event: ${selectedSession.event_name || 'Sesi Umum'} • Folder: ${selectedSession.id}` : ''}
        maxWidth="max-w-3xl"
        padding="p-5 sm:p-6"
      >
        {selectedSession && (
          <div className="w-full flex flex-col gap-4">
            {/* Top Row: Preview on Left, Compact QR Code on Right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Left Column: Framed Strip Showcase */}
              <div className="md:col-span-7 flex items-center justify-center p-3 bg-slate-950/80 rounded-2xl border border-white/10 shadow-inner w-full min-h-[220px]">
                {selectedSession.composite_url ? (
                  <img
                    src={selectedSession.composite_url}
                    alt={selectedSession.frame_name}
                    className="max-h-[36vh] max-w-full object-contain rounded-xl shadow-2xl"
                  />
                ) : (
                  <div className="text-slate-500 text-xs">No preview image</div>
                )}
              </div>

              {/* Right Column: Secure QR Code & Cloud Storage Card */}
              <div className="md:col-span-5 bg-slate-900/90 rounded-2xl p-4 border border-white/15 shadow-xl flex flex-col items-center text-center gap-2">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <Badge variant="violet" icon={CalendarDays} size="sm">
                    {selectedSession.event_name || 'Event Sesi'}
                  </Badge>
                  {selectedSession.drive_upload_status === 'success' ? (
                    <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-blue-400" />
                      <span>Drive Synced</span>
                    </span>
                  ) : selectedSession.drive_upload_status === 'uploading' ? (
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Syncing...</span>
                    </span>
                  ) : null}
                </div>

                {qrCodeDataUrl ? (
                  <div className="bg-white p-2 rounded-xl shadow-xl">
                    <img src={qrCodeDataUrl} alt="Scan QR to Download" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1.5 font-bold cursor-pointer transition"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Secure Link'}</span>
                </button>

                {/* Cloud & Token Action Controls */}
                <div className="w-full flex flex-col gap-1.5 pt-2 border-t border-white/10 text-xs">
                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRegenerateToken(selectedSession.id)}
                      className="flex-1 text-[10px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-semibold transition border border-white/10"
                      title="Generate a fresh token and revoke previous link"
                    >
                      <RefreshCw className="w-3 h-3 text-pink-400" />
                      <span>Regenerate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRevokeToken(selectedSession.id)}
                      className="text-[10px] text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 font-semibold transition"
                      title="Immediately revoke customer access"
                    >
                      <ShieldOff className="w-3 h-3" />
                      <span>Revoke</span>
                    </button>
                  </div>

                  {selectedSession.drive_upload_status !== 'success' && (
                    <button
                      type="button"
                      onClick={() => handleRetryDriveUpload(selectedSession.id)}
                      disabled={isSyncingDrive}
                      className="w-full text-[10px] text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 font-semibold transition mt-0.5"
                    >
                      <Cloud className={`w-3 h-3 text-blue-400 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                      <span>{isSyncingDrive ? 'Syncing to Drive...' : 'Sync to Google Drive'}</span>
                    </button>
                  )}
                </div>

                {shareActionStatus && (
                  <p className="text-[10px] text-emerald-400 font-bold mt-0.5 max-w-xs truncate animate-fade-in">
                    {shareActionStatus}
                  </p>
                )}
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
                  disabled={isReprinting}
                  onClick={() => handlePrintSession(selectedSession.composite_url)}
                >
                  {isReprinting ? 'Sending to Printer...' : 'Reprint Strip'}
                </Button>
              </div>
              {reprintStatus && (
                <p className="text-xs text-pink-400 font-semibold mt-2 w-full text-right">
                  {reprintStatus}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
