import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RotateCcw, 
  Sliders, 
  Check, 
  XCircle, 
  Clock, 
  Layers,
  Sparkles,
  Info,
  Eye,
  FileText
} from 'lucide-react';
import { Button, Modal } from '../common';
import { printerService } from '../../services/printerService';
import { useAuth } from '../../context/AuthContext';

function PrintPreviewMockup({ config }) {
  const isLandscape = config.orientation === 'landscape';
  const isBorderless = Boolean(config.borderless);
  const isMonochrome = config.colorMode === 'monochrome';
  const paperKey = config.paperSize || '4x6';

  const dimMap = {
    '4x6': { w: 180, h: 270, label: '4 x 6 in (102 x 152 mm)', layout: 'postcard' },
    '2x6': { w: 100, h: 300, label: '2 x 6 in (51 x 152 mm)', layout: 'strip' },
    '3.5x5': { w: 175, h: 250, label: '3.5 x 5 in (89 x 127 mm)', layout: 'postcard' },
    '5x7': { w: 195, h: 273, label: '5 x 7 in (127 x 178 mm)', layout: 'postcard' },
    'A4': { w: 190, h: 268, label: 'A4 (210 x 297 mm)', layout: 'postcard' }
  };

  const dim = dimMap[paperKey] || dimMap['4x6'];
  const previewWidth = isLandscape ? dim.h : dim.w;
  const previewHeight = isLandscape ? dim.w : dim.h;
  const isStrip = paperKey === '2x6';

  return (
    <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <span className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          Contoh Hasil Print (Live Mockup)
        </span>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {paperKey} • {config.orientation}
        </span>
      </div>

      {/* Realistic Photo Paper Container */}
      <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-slate-950/90 border border-white/10 shadow-inner relative overflow-hidden min-h-[350px]">
        {/* Studio Lighting Background Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.08)_0%,_transparent_70%)] pointer-events-none" />

        {/* Physical Paper Model */}
        <div
          style={{
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className={`relative bg-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-black/10 rounded-[2px] overflow-hidden flex flex-col ${
            isBorderless ? 'p-0' : 'p-2'
          }`}
        >
          {/* Paper Content: Strip vs Postcard */}
          <div
            className={`w-full h-full flex flex-col justify-between overflow-hidden bg-slate-900 ${
              isMonochrome ? 'grayscale contrast-125' : ''
            }`}
          >
            {isStrip ? (
              // 2x6 Photo Strip Layout (3 Poses + Footer)
              <div className="w-full h-full p-1.5 flex flex-col justify-between bg-zinc-900">
                <div className="space-y-1.5 flex-1 flex flex-col justify-evenly">
                  {[1, 2, 3].map((num) => (
                    <div
                      key={num}
                      className="w-full aspect-[4/3] rounded-sm bg-gradient-to-tr from-pink-500/40 via-purple-500/40 to-indigo-500/40 border border-white/20 relative overflow-hidden flex items-center justify-center"
                    >
                      <Sparkles className="w-4 h-4 text-white/80 animate-pulse" />
                      <span className="absolute bottom-1 right-1 text-[8px] font-mono text-white/70">#{num}</span>
                    </div>
                  ))}
                </div>
                {/* Strip Branding Footer */}
                <div className="pt-1.5 pb-0.5 text-center border-t border-white/20 mt-1">
                  <p className="text-[8px] font-black tracking-widest text-white uppercase">PHOTOBOOTH</p>
                  <p className="text-[6px] text-pink-400 font-mono">2026 • STUDIO CIPUT</p>
                </div>
              </div>
            ) : (
              // 4x6 / Postcard Layout (4 Grid Poses + Header & Footer)
              <div className="w-full h-full p-2.5 flex flex-col justify-between bg-zinc-900">
                <div className="flex items-center justify-between pb-1 border-b border-white/10 mb-1">
                  <span className="text-[9px] font-black text-pink-400 tracking-wider">PHOTOBOOTH STUDIO</span>
                  <span className="text-[7px] font-mono text-slate-400">MEMORIES</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 flex-1 items-center">
                  {[1, 2, 3, 4].map((num) => (
                    <div
                      key={num}
                      className="w-full h-full min-h-[50px] rounded-sm bg-gradient-to-br from-indigo-500/40 via-purple-500/40 to-pink-500/40 border border-white/15 relative overflow-hidden flex items-center justify-center"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white/70" />
                      <span className="absolute top-1 left-1 text-[7px] font-mono text-white/60">P{num}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-1 text-center border-t border-white/10 mt-1 flex justify-between items-center text-[7px] text-slate-400">
                  <span>PRINTED ON EPSON</span>
                  <span className="text-pink-400 font-bold">★ SPECIAL EDITION</span>
                </div>
              </div>
            )}
          </div>

          {/* Glossy Sheen Reflection Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/10 pointer-events-none mix-blend-overlay" />

          {/* Outer Border Indicator Overlay if Borderless */}
          {isBorderless && (
            <div className="absolute inset-0 border border-red-500/40 pointer-events-none" title="Edge-to-Edge Bleed" />
          )}
        </div>

        {/* Paper Dimension Stamp */}
        <span className="mt-4 text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-pink-400" />
          {dim.label}
        </span>
      </div>

      {/* Specifications Badges & Info */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {isBorderless ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Zero Margin (Physical Bleed)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              Standard Margin (~5mm White Border)
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-white/10">
            {config.colorMode === 'monochrome' ? 'B&W Grayscale' : 'Full Color'}
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-white/10">
            {config.fitToPaper === 'fit' ? 'Fit Content' : 'Fill (Full Bleed)'}
          </span>
        </div>

        <p className="text-slate-400 text-xs leading-relaxed">
          {isBorderless
            ? 'Mode Borderless aktif: foto akan dicetak memenuhi seluruh kertas foto Epson tanpa margin putih di tepi.'
            : 'Mode Borderless nonaktif: printer menyisakan margin putih sekitar 5mm di setiap tepi kertas.'}
        </p>
      </div>
    </div>
  );
}

export default function PrinterSettings() {
  const { authFetch } = useAuth();
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [queue, setQueue] = useState([]);

  const isDesktop = printerService.isElectron();

  const [config, setConfig] = useState({
    printerName: '',
    paperSize: '4x6',
    mediaType: 'epson_glossy',
    printQuality: 'high',
    colorMode: 'color',
    orientation: 'portrait',
    borderless: true,
    fitToPaper: 'fill',
    copies: 1
  });

  // Load available printers and current configuration
  const loadPrintersAndConfig = async () => {
    setLoadingPrinters(true);
    try {
      const [printerList, savedConfig, queueData] = await Promise.all([
        printerService.getPrinters(),
        printerService.getConfig(),
        printerService.getQueue()
      ]);

      setPrinters(printerList);
      if (savedConfig) {
        setConfig((prev) => ({ ...prev, ...savedConfig }));
      }
      if (queueData) {
        setQueue(queueData);
      }
    } catch (err) {
      console.error('Failed to load printer data:', err);
    } finally {
      setLoadingPrinters(false);
    }
  };

  useEffect(() => {
    loadPrintersAndConfig();

    // Subscribe to live status changes
    const unsub = printerService.onStatusChange((updatedJob) => {
      setQueue((prevQueue) => {
        const index = prevQueue.findIndex((j) => j.id === updatedJob.id);
        if (index >= 0) {
          const next = [...prevQueue];
          next[index] = updatedJob;
          return next;
        }
        return [updatedJob, ...prevQueue.slice(0, 19)];
      });
    });

    return () => unsub();
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await printerService.saveConfig(config, authFetch);
      setSaveSuccess(true);
      setStatusMessage({ type: 'success', text: 'Printer settings saved successfully!' });
      setTimeout(() => {
        setSaveSuccess(false);
        setStatusMessage(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Failed to save printer settings: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumePrinter = async () => {
    if (!selectedPrinterInfo?.name) return;
    setStatusMessage({ type: 'info', text: 'Mereset antrian spooler printer...' });
    try {
      const res = await printerService.resumePrinter(selectedPrinterInfo.name);
      if (res?.success) {
        setStatusMessage({ type: 'success', text: res.message || 'Antrian printer berhasil dibersihkan dan diaktifkan kembali!' });
        await loadPrintersAndConfig();
      } else {
        setStatusMessage({ type: 'error', text: res?.message || 'Gagal mereset antrian printer' });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Error mereset printer: ' + e.message });
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    try {
      const res = await printerService.runTestPrint(config);
      if (res?.success) {
        const isVirtual = config.printerName === 'Virtual_PDF_Printer' || res.isVirtual;
        setStatusMessage({
          type: 'success',
          text: isVirtual
            ? '📄 Simulasi borderless PDF berhasil dibuat dan dibuka otomatis dari folder Downloads/photobooth-prints!'
            : `Test print dikirim ke ${config.printerName || 'Default Printer'}! Silakan periksa hasil cetakan.`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res?.error || 'Test print gagal dikirim'
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Error executing test print' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleOpenPreview = async () => {
    try {
      const svg = await printerService.previewPattern(config);
      if (svg) {
        setPreviewModalUrl(svg);
      }
    } catch (e) {
      console.error('Failed to generate preview:', e);
    }
  };

  const handleRetryJob = async (jobId) => {
    try {
      await printerService.retryJob(jobId);
      setStatusMessage({ type: 'success', text: `Retrying print job ${jobId}...` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Retry failed: ' + err.message });
    }
  };

  const selectedPrinterInfo = printers.find(
    (p) => p.name === config.printerName || p.displayName === config.printerName
  );

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-white">Epson Printer & Borderless Settings</h3>
              <p className="text-slate-400 text-xs sm:text-sm">
                Configure default Epson printer, zero-margin borderless printing, and silent automation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={loadPrintersAndConfig}
            disabled={loadingPrinters}
            className="flex items-center gap-2 text-xs py-2 px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPrinters ? 'animate-spin' : ''}`} />
            <span>Refresh Printers</span>
          </Button>

          {isDesktop && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenPreview}
                className="flex items-center gap-2 text-xs py-2 px-3 border border-white/20"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Preview Pola</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={handleTestPrint}
                disabled={isTesting || loadingPrinters}
                className="flex items-center gap-2 text-xs py-2 px-3 border border-pink-500/40"
              >
                <Play className="w-3.5 h-3.5 text-pink-400" />
                <span>{isTesting ? 'Sending...' : 'Test Print'}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Notification banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Controls */}
          <div className="xl:col-span-7 space-y-6">
            {/* Printer Selection Card */}
            <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <Printer className="w-4 h-4 text-pink-400" />
                  Default Printer Selection
                </span>
                {selectedPrinterInfo && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedPrinterInfo.isConnected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          selectedPrinterInfo.isConnected ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                      {selectedPrinterInfo.statusText || (selectedPrinterInfo.isConnected ? 'Connected' : 'Disconnected')}
                    </span>

                    {!selectedPrinterInfo.isConnected && isDesktop && !selectedPrinterInfo.isVirtual && (
                      <button
                        type="button"
                        onClick={handleResumePrinter}
                        className="text-[11px] font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        title="Bersihkan antrian macet dan aktifkan kembali antrian printer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Resume Queue</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2.5">
                  Select Connected Printer
                </label>
                <select
                  value={config.printerName}
                  onChange={(e) => setConfig({ ...config, printerName: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 px-4 py-3 sm:py-3.5 rounded-2xl text-sm text-white focus:border-pink-500 outline-none cursor-pointer shadow-inner"
                >
                  <option value="">-- Use OS Default Printer --</option>
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.displayName || p.name} {p.isEpson ? '★ [Epson]' : ''} {p.isDefault ? '(OS Default)' : ''}
                    </option>
                  ))}
                </select>
                {printers.length === 0 && (
                  <p className="text-amber-400 text-xs mt-2.5 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    No local printers detected. Ensure your Epson printer is plugged in via USB or connected to Wi-Fi.
                  </p>
                )}
              </div>
            </div>

            {/* Paper & Borderless Configuration */}
            <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="border-b border-white/10 pb-4">
                <span className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  Epson Media & Borderless Controls
                </span>
              </div>

              {/* Grid of settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Paper Size */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                    Paper Size
                  </label>
                  <select
                    value={config.paperSize}
                    onChange={(e) => setConfig({ ...config, paperSize: e.target.value })}
                    className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-pink-500 outline-none cursor-pointer shadow-inner"
                  >
                    <option value="4x6">4 x 6 in (10 x 15 cm Postcard)</option>
                    <option value="2x6">2 x 6 in (Photo Strip)</option>
                    <option value="3.5x5">3.5 x 5 in (3R)</option>
                    <option value="5x7">5 x 7 in (5R)</option>
                    <option value="A4">A4 (210 x 297 mm)</option>
                  </select>
                </div>

                {/* Media / Paper Type */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                    Epson Media Type
                  </label>
                  <select
                    value={config.mediaType}
                    onChange={(e) => setConfig({ ...config, mediaType: e.target.value })}
                    className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-pink-500 outline-none cursor-pointer shadow-inner"
                  >
                    <option value="epson_premium_glossy">Epson Premium Glossy</option>
                    <option value="epson_glossy">Epson Photo Paper Glossy</option>
                    <option value="epson_matte">Epson Matte Paper</option>
                    <option value="plain_paper">Plain Paper</option>
                  </select>
                </div>

                {/* Print Quality */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                    Print Quality
                  </label>
                  <select
                    value={config.printQuality}
                    onChange={(e) => setConfig({ ...config, printQuality: e.target.value })}
                    className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-pink-500 outline-none cursor-pointer shadow-inner"
                  >
                    <option value="high">High / Best Photo (Recommended)</option>
                    <option value="standard">Standard Photo</option>
                    <option value="draft">Draft / Fast</option>
                  </select>
                </div>

                {/* Color Mode */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                    Color Mode
                  </label>
                  <select
                    value={config.colorMode}
                    onChange={(e) => setConfig({ ...config, colorMode: e.target.value })}
                    className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-pink-500 outline-none cursor-pointer shadow-inner"
                  >
                    <option value="color">Full Color</option>
                    <option value="monochrome">Grayscale / Monochrome</option>
                  </select>
                </div>

                {/* Orientation */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                    Orientation
                  </label>
                  <select
                    value={config.orientation}
                    onChange={(e) => setConfig({ ...config, orientation: e.target.value })}
                    className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-pink-500 outline-none cursor-pointer shadow-inner"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                {/* Scaling / Fit */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                    Scaling to Paper
                  </label>
                  <select
                    value={config.fitToPaper}
                    onChange={(e) => setConfig({ ...config, fitToPaper: e.target.value })}
                    className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-pink-500 outline-none cursor-pointer shadow-inner"
                  >
                    <option value="fill">Fill Paper (Edge-to-edge full bleed)</option>
                    <option value="fit">Fit to Paper (Keep full photo without crop)</option>
                  </select>
                </div>

                {/* Default Copies */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                    Default Copies per Session
                  </label>
                  <select
                    value={config.copies}
                    onChange={(e) => setConfig({ ...config, copies: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-pink-500 outline-none cursor-pointer shadow-inner"
                  >
                    <option value={1}>1 Copy</option>
                    <option value={2}>2 Copies (Strip Pair)</option>
                    <option value={3}>3 Copies</option>
                    <option value={4}>4 Copies</option>
                  </select>
                </div>
              </div>

              {/* Borderless Toggle */}
              <div className="pt-4 border-t border-white/10">
                <label className="flex items-start gap-4 p-5 sm:p-6 rounded-2xl bg-slate-950/70 border border-white/15 hover:border-pink-500/50 cursor-pointer transition shadow-inner">
                  <input
                    type="checkbox"
                    checked={config.borderless}
                    onChange={(e) => setConfig({ ...config, borderless: e.target.checked })}
                    className="w-5 h-5 mt-1 rounded text-pink-600 focus:ring-pink-500 cursor-pointer shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm sm:text-base">
                        Enable Physical Borderless Printing
                      </span>
                      <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Epson Zero-Margin
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                      Removes all hardware print margins (0mm bleed) using Epson driver expansion. Ensures photos print edge-to-edge without white borders around the paper.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Physical Mockup */}
          <div className="xl:col-span-5 xl:sticky xl:top-6 space-y-6">
            <PrintPreviewMockup config={config} />
          </div>
        </div>

        {/* Save Button Row */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess && (
            <span className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Printer settings saved and ready!</span>
            </span>
          )}
          <Button type="submit" disabled={isSaving} className="ml-auto flex items-center gap-2 px-8 py-3.5 shadow-xl">
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Configuration...' : 'Save Printer Settings'}</span>
          </Button>
        </div>
      </form>

      {/* Print Queue / Recent Activity */}
      {queue.length > 0 && (
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Recent Print Jobs ({queue.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">Job ID</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Printer</th>
                  <th className="py-2.5 px-3">Copies</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {queue.slice(0, 8).map((job) => (
                  <tr key={job.id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-3 font-mono text-slate-300">{job.id.slice(-8)}</td>
                    <td className="py-3 px-3 capitalize text-slate-300">{job.source}</td>
                    <td className="py-3 px-3 text-slate-300 font-medium">{job.printerName}</td>
                    <td className="py-3 px-3 text-slate-300">{job.copies}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold ${
                          job.status === 'Completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : job.status === 'Printing'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                            : job.status === 'Failed'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {job.status === 'Completed' && <Check className="w-3 h-3" />}
                        {job.status === 'Failed' && <XCircle className="w-3 h-3" />}
                        {job.status}
                      </span>
                      {job.error && (
                        <p className="text-[10px] text-rose-400 mt-1 max-w-xs truncate" title={job.error}>
                          {job.error}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {job.status === 'Failed' && (
                        <button
                          type="button"
                          onClick={() => handleRetryJob(job.id)}
                          className="text-pink-400 hover:text-pink-300 font-bold inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Preview Pola Cetak */}
      {previewModalUrl && (
        <Modal
          isOpen={Boolean(previewModalUrl)}
          onClose={() => setPreviewModalUrl(null)}
          title="Preview Pola Test Print (Borderless Calibration)"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-xs text-slate-300">
              Garis merah di sekeliling terluar adalah penanda batas bleed fisik borderless. Pada cetakan fisik, garis ini akan terpotong tepat di tepi kertas tanpa menyisakan margin putih.
            </p>
            <div className="max-h-[60vh] overflow-auto rounded-xl border border-white/20 shadow-2xl bg-white p-2">
              <img src={previewModalUrl} alt="Test Pattern" className="max-w-full h-auto object-contain mx-auto" />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreviewModalUrl(null)}
              className="mt-2 text-xs"
            >
              Tutup Preview
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

