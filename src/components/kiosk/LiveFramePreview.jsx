import React from 'react';
import { FILTERS } from '../../utils/canvasRenderer';

/**
 * LiveFramePreview Component
 * Renders the photobooth frame with either live looping motion video clips
 * or standard captured photos inside the exact photo slots, overlaid by the frame PNG.
 */
export default function LiveFramePreview({
  frame,
  photos = [],
  liveClips = [],
  filterId = 'normal',
  stickers = [],
  customText = '',
  isLive = true,
  className = '',
  isMirrored = false
}) {
  if (!frame) return null;

  const frameWidth = frame.width || 1200;
  const frameHeight = frame.height || 1800;
  const aspectRatio = `${frameWidth} / ${frameHeight}`;
  const sortedSlots = [...(frame.photo_slots || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

  const filterConfig = FILTERS.find((f) => f.id === filterId) || FILTERS[0];
  const filterCss = filterConfig && filterConfig.css !== 'none' ? filterConfig.css : 'none';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-2xl bg-white select-none ${className}`}
      style={{
        aspectRatio,
        maxHeight: '100%',
        maxWidth: '100%'
      }}
    >
      {/* Photo Slots Layer */}
      {sortedSlots.map((slot, idx) => {
        const leftPercent = (slot.x / frameWidth) * 100;
        const topPercent = (slot.y / frameHeight) * 100;
        const widthPercent = (slot.width / frameWidth) * 100;
        const heightPercent = (slot.height / frameHeight) * 100;

        const targetIndex = slot.photo_index !== undefined && slot.photo_index !== null
          ? (Number(slot.photo_index) - 1)
          : (slot.order !== undefined && slot.order !== null ? Number(slot.order) - 1 : idx);

        const clipSrc = liveClips[targetIndex] || liveClips[idx % (liveClips.length || 1)] || (liveClips.length > 0 ? liveClips[0] : null);
        const photoSrc = photos[targetIndex] || photos[idx % (photos.length || 1)] || (photos.length > 0 ? photos[0] : null);

        const shouldPlayLive = isLive && Boolean(clipSrc);

        return (
          <div
            key={slot.order ?? idx}
            className="absolute overflow-hidden bg-slate-900"
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              width: `${widthPercent}%`,
              height: `${heightPercent}%`,
              filter: filterCss
            }}
          >
            {photoSrc && (
              <img
                src={photoSrc}
                alt={`Photo Slot ${idx + 1}`}
                className={`absolute inset-0 w-full h-full object-cover ${
                  isMirrored ? 'scale-x-[-1]' : ''
                }`}
              />
            )}
            {shouldPlayLive && (
              <video
                ref={(el) => {
                  if (el) {
                    el.muted = true;
                    el.defaultMuted = true;
                    el.play().catch(() => {});
                  }
                }}
                src={clipSrc}
                autoPlay
                loop
                muted
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isMirrored ? 'scale-x-[-1]' : ''
                }`}
              />
            )}
            {!photoSrc && !shouldPlayLive && (
              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500 text-xs font-bold">
                Slot {idx + 1}
              </div>
            )}
          </div>
        );
      })}

      {/* Frame Transparent Overlay PNG on Top */}
      {frame.image_url && (
        <img
          src={frame.image_url}
          alt={frame.name || 'Frame Overlay'}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        />
      )}

      {/* Custom Stickers */}
      {stickers && stickers.length > 0 && stickers.map((sticker) => {
        const leftPercent = sticker.x;
        const topPercent = sticker.y;
        const sizePx = (sticker.size || 70) * 0.35;

        return (
          <div
            key={sticker.id}
            className="absolute pointer-events-none z-20 flex items-center justify-center select-none"
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              fontSize: `${sizePx}px`,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation || 0}deg)`
            }}
          >
            {sticker.emoji}
          </div>
        );
      })}

      {/* Custom Text / Studio Watermark */}
      {customText && (
        <div
          className="absolute bottom-3 inset-x-0 text-center font-bold text-white z-20 pointer-events-none select-none tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          style={{ fontSize: 'min(1.8vw, 13px)' }}
        >
          {customText}
        </div>
      )}
    </div>
  );
}
