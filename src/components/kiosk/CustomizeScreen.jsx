import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Palette, Smile, Type, ArrowRight, Check, Camera, Video } from 'lucide-react';
import { useBooth } from '../../context/BoothContext';
import { FILTERS, generateComposite } from '../../utils/canvasRenderer';
import { Button, Badge, AmbientBackground, GlassCard, TabGroup } from '../common';
import LiveFramePreview from './LiveFramePreview';

const STICKER_LIST = [
  '🕶️', '👑', '✨', '💖', '⭐', '🔥', '🌸', '🐱', '🎀', '🎉', '🥰', '✌️', '🌈', '⚡'
];

export default function CustomizeScreen() {
  const {
    selectedFrame,
    capturedPhotos,
    capturedLiveClips,
    filterId,
    selectFilter,
    stickers,
    addSticker,
    removeSticker,
    customText,
    setCustomText,
    previewMode,
    setPreviewMode,
    processAndFinishSession,
    retakeAllPhotos,
    retakeSlot,
    isLoading,
    settings
  } = useBooth();

  const isFiltersEnabled = settings?.enableFilters !== false;
  const isStickersEnabled = settings?.enableStickers !== false;

  const [previewDataUrl, setPreviewDataUrl] = useState('');
  const [activeTab, setActiveTab] = useState(isFiltersEnabled ? 'filters' : isStickersEnabled ? 'stickers' : 'text');

  const customizeTabs = [
    ...(isFiltersEnabled ? [{ id: 'filters', label: 'Filters', icon: Palette }] : []),
    ...(isStickersEnabled ? [{ id: 'stickers', label: 'Stickers', icon: Smile }] : []),
    { id: 'text', label: 'Text', icon: Type },
    { id: 'retake', label: 'Retake', icon: RefreshCw }
  ];

  // Update composite preview whenever frame, filter, stickers, or text changes
  useEffect(() => {
    let isCancelled = false;

    async function updatePreview() {
      if (!selectedFrame || capturedPhotos.length === 0) return;
      try {
        const dataUrl = await generateComposite({
          frame: selectedFrame,
          photos: capturedPhotos,
          filterId,
          stickers,
          customText
        });
        if (!isCancelled) {
          setPreviewDataUrl(dataUrl);
        }
      } catch (e) {
        console.error('Preview composite error:', e);
      }
    }

    updatePreview();

    return () => {
      isCancelled = true;
    };
  }, [selectedFrame, capturedPhotos, filterId, stickers, customText]);

  return (
    <div className="relative w-full h-full flex flex-col p-3 sm:p-5 lg:p-6 overflow-hidden bg-slate-950 justify-between">
      {/* Background glow */}
      <AmbientBackground primaryColor="bg-violet-600/10" secondaryColor="bg-pink-600/10" />

      {/* Top Header */}
      <div className="mx-auto w-full flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="p-2 sm:p-3 rounded-2xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg sm:text-2xl text-white">Customize Your Print</h2>
            <p className="text-slate-400 text-[11px] sm:text-xs">Apply color filters, add fun stickers, and customize text captions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={RefreshCw}
            onClick={retakeAllPhotos}
            className="rounded-full text-xs py-1.5 px-3 sm:px-4"
          >
            Retake All
          </Button>
        </div>
      </div>

      {/* Main Center Area: Left is Live Strip Preview, Right is Editing Controls */}
      <div className="w-full max-w-7xl mx-auto z-10 flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-5 lg:gap-8 items-center min-h-0 my-auto py-2">
        {/* Left: Interactive Live Preview Card (Enlarged) */}
        <div className="md:col-span-5 lg:col-span-6 h-full max-h-[35vh] md:max-h-full flex flex-col items-center justify-center gap-2 min-h-0">
          {/* Mode Switcher Pill */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-white/20 shadow-xl flex-shrink-0">
            <button
              type="button"
              onClick={() => setPreviewMode('photo')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                previewMode === 'photo'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Photo Strip</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('live')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                previewMode === 'live'
                  ? 'bg-gradient-to-r from-violet-600 via-pink-500 to-amber-400 text-white shadow-lg shadow-violet-500/30 ring-1 ring-white/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Live Picture ✨</span>
            </button>
          </div>

          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden glass-panel border border-white/20 p-2 sm:p-4 shadow-2xl bg-slate-950/95 flex-1 w-full flex items-center justify-center min-h-0">
            {previewMode === 'live' ? (
              <LiveFramePreview
                frame={selectedFrame}
                photos={capturedPhotos}
                liveClips={capturedLiveClips}
                filterId={filterId}
                stickers={stickers}
                customText={customText}
                isLive={true}
                className="h-full w-auto max-w-full object-contain"
              />
            ) : previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="Photobooth Strip Preview"
                className="h-full w-auto max-w-full object-contain rounded-2xl shadow-xl"
              />
            ) : (
              <div className="w-48 h-60 flex flex-col items-center justify-center text-slate-500">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-xs font-bold">Rendering strip...</p>
              </div>
            )}

            {/* Sticker Badges overlay indicator */}
            {stickers.length > 0 && (
              <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-[11px] font-bold text-pink-300 flex items-center gap-1.5 shadow-xl">
                <span>{stickers.length} Stickers</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Customization Controls Panel */}
        <div className="md:col-span-7 lg:col-span-6 h-full flex flex-col gap-2.5 sm:gap-3.5 glass-panel rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-white/20 shadow-2xl min-h-0 justify-between">
          {/* Reusable TabGroup */}
          <TabGroup
            tabs={customizeTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            fullWidth
            size="sm"
            className="flex bg-slate-900/90 p-1 rounded-2xl border border-white/15 gap-1.5 shadow-inner w-full flex-shrink-0"
          />

          {/* Active Tab Panel with controlled height */}
          <div className="flex-1 min-h-0 flex flex-col justify-center overflow-y-auto no-scrollbar py-1">
            {/* Tab 1: Color Presets */}
            {activeTab === 'filters' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 overflow-y-auto max-h-[28vh] md:max-h-[35vh] no-scrollbar pr-1">
                {FILTERS.map((f) => (
                  <Button
                    key={f.id}
                    variant="outline"
                    onClick={() => selectFilter(f.id)}
                    className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${filterId === f.id
                      ? 'border-pink-500 bg-pink-500/15 ring-2 ring-pink-500/30 shadow-lg'
                      : 'border-white/10 bg-slate-900/90 hover:border-white/20'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-white">{f.name}</span>
                      {filterId === f.id && <Check className="w-3.5 h-3.5 text-pink-400 stroke-[3]" />}
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {/* Tab 2: Fun Stickers */}
            {activeTab === 'stickers' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] sm:text-xs font-bold text-slate-400">Click to stamp a fun sticker on your photo:</p>
                  {stickers.length > 0 && (
                    <Button
                      onClick={() => stickers.forEach((s) => removeSticker(s.id))}
                      className="text-xs font-bold text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 max-h-[28vh] md:max-h-[35vh] overflow-y-auto no-scrollbar">
                  {STICKER_LIST.map((emoji, idx) => (
                    <Button
                      variant="outline"
                      key={idx}
                      onClick={() => addSticker(emoji)}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-900/90 hover:bg-violet-600/40 border border-white/10 text-xl sm:text-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition shadow-lg cursor-pointer p-0"
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Custom Caption */}
            {activeTab === 'text' && (
              <div className="flex flex-col gap-2.5">
                <p className="text-[11px] sm:text-xs font-bold text-slate-400">Add watermark or studio timestamp:</p>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="E.g. JANE & JOHN • 2026"
                  className="w-full bg-slate-900/90 border border-white/15 px-4 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:border-pink-500 outline-none shadow-inner"
                />
                <div className="flex gap-2 flex-wrap">
                  {['MEMORIES 2026', 'BEST FRIENDS ✨', ''].map((preset, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomText(preset)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
                    >
                      {preset || 'None'}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Retake Slot */}
            {activeTab === 'retake' && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] sm:text-xs font-bold text-slate-400">Select a single shot to retake:</p>
                <div className="grid grid-cols-3 gap-2.5 max-h-[28vh] md:max-h-[35vh] overflow-y-auto no-scrollbar">
                  {capturedPhotos.map((photo, idx) => (
                    <div
                      key={idx}
                      onClick={() => retakeSlot(idx)}
                      className="relative group cursor-pointer rounded-xl overflow-hidden border border-white/20 aspect-square bg-slate-900 p-0.5 shadow-md hover:border-pink-500"
                    >
                      <img src={photo} alt={`Snap ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition rounded-lg">
                        <RefreshCw className="w-5 h-5 mb-1 text-pink-400 animate-spin" style={{ animationDuration: '4s' }} />
                        <span className="text-[11px] font-black">Retake #{idx + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Proceed Button - ALWAYS VISIBLE, NEVER CUT OFF */}
          <div className="pt-2 flex-shrink-0">
            <Button
              variant="primary"
              size="lg"
              rightIcon={ArrowRight}
              onClick={processAndFinishSession}
              disabled={isLoading}
              loading={isLoading}
              className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-display font-black text-sm sm:text-base shadow-xl"
            >
              FINISH & PRINT STRIP
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
