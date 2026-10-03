import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Palette, Smile, Type, ArrowRight, Check } from 'lucide-react';
import { useBooth } from '../../context/BoothContext';
import { FILTERS, generateComposite } from '../../utils/canvasRenderer';
import { Button, Badge, AmbientBackground, GlassCard, TabGroup } from '../common';

const STICKER_LIST = [
  '🕶️', '👑', '✨', '💖', '⭐', '🔥', '🌸', '🐱', '🎀', '🎉', '🥰', '✌️', '🌈', '⚡'
];

export default function CustomizeScreen() {
  const {
    selectedFrame,
    capturedPhotos,
    filterId,
    selectFilter,
    stickers,
    addSticker,
    removeSticker,
    customText,
    setCustomText,
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
    <div className="relative w-full h-full flex flex-col py-4 px-8 sm:px-12 overflow-hidden bg-slate-950 gap-4" style={{ marginTop: '32px' }}>
      {/* Background glow */}
      <AmbientBackground primaryColor="bg-violet-600/10" secondaryColor="bg-pink-600/10" />

      {/* Top Header */}
      <div className="mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white">Customize Your Print</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">Apply color filters, add fun stickers, and customize text captions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            leftIcon={RefreshCw}
            onClick={retakeAllPhotos}
            className="rounded-full"
          >
            Retake All
          </Button>
        </div>
      </div>

      {/* Main Center Area: Left is Live Strip Preview, Right is Editing Controls */}
      <div className="w-full max-w-7xl mx-auto my-auto z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center px-4">
        {/* Left: Interactive Live Preview Card (Enlarged) */}
        <div className="md:col-span-6 flex items-center justify-center">
          <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/20 p-4 sm:p-6 shadow-2xl bg-slate-950/95 max-h-[72vh] w-full flex items-center justify-center">
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="Photobooth Strip Preview"
                className="max-h-[64vh] w-auto max-w-full object-contain rounded-2xl shadow-xl"
              />
            ) : (
              <div className="w-64 h-80 flex flex-col items-center justify-center text-slate-500">
                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-bold">Rendering strip...</p>
              </div>
            )}

            {/* Sticker Badges overlay indicator */}
            {stickers.length > 0 && (
              <div className="absolute top-6 left-6 bg-slate-900/90 backdrop-blur-md px-6 py-2 rounded-full border border-white/15 text-xs font-bold text-pink-300 flex items-center gap-2 shadow-xl">
                <span>{stickers.length} Stickers Placed</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Customization Controls Panel */}
        <div className="md:col-span-6 flex flex-col gap-6 glass-panel rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl">
          {/* Reusable TabGroup */}
          <TabGroup
            tabs={customizeTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            fullWidth
            className="flex bg-slate-900/90 h-10 p-2 rounded-2xl border border-white/15 gap-2 shadow-inner w-full"
          />

          {/* Tab 1: Color Presets */}
          {activeTab === 'filters' && (
            <div className="grid grid-cols-3 gap-3.5 max-h-60 overflow-y-auto no-scrollbar pr-1">
              {FILTERS.map((f) => (
                <Button
                  key={f.id}
                  variant='outline'
                  onClick={() => selectFilter(f.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-10 ${filterId === f.id
                    ? 'border-pink-500 bg-pink-500/15 ring-2 ring-pink-500/30 shadow-lg'
                    : 'border-white/10 bg-slate-900 hover:border-white/20'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{f.name}</span>
                    {filterId === f.id && <Check className="w-4 h-4 text-pink-400 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] text-slate-400 line-clamp-2">{f.description}</span>
                </Button>
              ))}
            </div>
          )}

          {/* Tab 2: Fun Stickers */}
          {activeTab === 'stickers' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400">Click to stamp a fun sticker on your photo:</p>
                {stickers.length > 0 && (
                  <Button
                    onClick={() => stickers.forEach((s) => removeSticker(s.id))}
                    className="text-xs font-bold text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {STICKER_LIST.map((emoji, idx) => (
                  <Button
                    variant='outline'
                    key={idx}
                    onClick={() => addSticker(emoji)}
                    className="w-13 h-13 rounded-2xl bg-slate-900/90 hover:bg-violet-600/40 border border-white/10 text-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition shadow-lg cursor-pointer"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Custom Caption */}
          {activeTab === 'text' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-bold text-slate-400">Add watermark or studio timestamp:</p>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="E.g. JANE & JOHN • 2026"
                className="w-full bg-slate-900/90 border border-white/15 px-8 py-4 rounded-2xl text-sm text-white focus:border-pink-500 outline-none shadow-inner"
                style={{ padding: '8px' }}
              />
              <div className="flex gap-3 flex-wrap h-10">
                {['MEMORIES 2026', 'BEST FRIENDS ✨', ''].map((preset, idx) => (
                  <Button
                    key={idx}
                    variant='outline'
                    onClick={() => setCustomText(preset)}
                    className="text-xs font-bold px-8 py-4 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition"
                  >
                    {preset || 'None'}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Retake Slot */}
          {activeTab === 'retake' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-slate-400">Select a single shot to retake:</p>
              <div className="grid grid-cols-3 gap-3.5">
                {capturedPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => retakeSlot(idx)}
                    className="relative group cursor-pointer rounded-2xl overflow-hidden border border-white/20 aspect-square bg-slate-900 p-1 shadow-md hover:border-pink-500"
                  >
                    <img src={photo} alt={`Snap ${idx + 1}`} className="w-full h-full object-cover rounded-xl" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition rounded-xl">
                      <RefreshCw className="w-7 h-7 mb-1.5 text-pink-400 animate-spin" style={{ animationDuration: '4s' }} />
                      <span className="text-xs font-black">Retake #{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proceed Button */}
          <div className="pt-3 mt-auto">
            <Button
              variant="primary"
              size="lg"
              rightIcon={ArrowRight}
              onClick={processAndFinishSession}
              disabled={isLoading}
              loading={isLoading}
              className="w-full py-5 rounded-2xl font-display font-black text-base"
            >
              FINISH & PRINT STRIP
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
