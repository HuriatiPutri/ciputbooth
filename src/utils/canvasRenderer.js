/**
 * High-performance Photobooth Canvas Renderer
 * Composites user photos into exact coordinate slots behind the transparent PNG frame overlay.
 */

export const FILTERS = [
  { id: 'normal', name: 'Original', css: 'none' },
  { id: 'mono', name: 'Noir B&W', css: 'grayscale(100%) contrast(120%) brightness(105%)' },
  { id: 'vintage', name: 'Vintage 90s', css: 'sepia(40%) contrast(110%) brightness(95%) saturate(130%)' },
  { id: 'warm', name: 'Golden Glow', css: 'sepia(25%) saturate(140%) brightness(105%) hue-rotate(-10deg)' },
  { id: 'cool', name: 'Cyber Blue', css: 'hue-rotate(180deg) saturate(130%) contrast(115%)' },
  { id: 'pastel', name: 'Sakura Dream', css: 'brightness(110%) saturate(85%) contrast(90%) hue-rotate(330deg)' },
  { id: 'dramatic', name: 'Studio Dramatic', css: 'contrast(140%) brightness(90%) saturate(110%)' }
];

/**
 * Loads an image from URL or DataURL as an HTMLImageElement
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Draws an image into a rectangle with "cover" behavior (cropping excess, preserving aspect ratio)
 */
export function drawImageCover(ctx, img, targetX, targetY, targetW, targetH) {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  const targetRatio = targetW / targetH;
  const imgRatio = imgW / imgH;

  let sx, sy, sWidth, sHeight;

  if (imgRatio > targetRatio) {
    // Image is wider than target: crop left & right
    sHeight = imgH;
    sWidth = imgH * targetRatio;
    sx = (imgW - sWidth) / 2;
    sy = 0;
  } else {
    // Image is taller than target: crop top & bottom
    sWidth = imgW;
    sHeight = imgW / targetRatio;
    sx = 0;
    sy = (imgH - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);
}

/**
 * Composites the photos into frame slots and overlays the frame PNG
 * @param {Object} frame Frame object containing image_url and photo_slots
 * @param {Array<string>} photos Array of photo data URLs
 * @param {Object} options Options like filterId, stickers, customText, mirror
 * @returns {Promise<string>} Base64 Data URL of the composite image
 */
export async function generateComposite({
  frame,
  photos,
  filterId = 'normal',
  stickers = [],
  customText = '',
  mirror = false
}) {
  if (!frame) throw new Error('Frame is required for composite generation');

  // Load frame overlay image first to determine real canvas dimensions
  const frameImg = await loadImage(frame.image_url);
  const canvasW = frame.width || frameImg.naturalWidth || 1200;
  const canvasH = frame.height || frameImg.naturalHeight || 1800;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  // 1. Draw solid background under slots (default white or neutral)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 2. Render each photo in its corresponding slot
  const sortedSlots = [...(frame.photo_slots || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const filterConfig = FILTERS.find((f) => f.id === filterId) || FILTERS[0];

  for (let i = 0; i < sortedSlots.length; i++) {
    const slot = sortedSlots[i];
    const photoSrc = photos[i] || photos[0]; // fallback if not enough photos

    if (photoSrc) {
      try {
        const photoImg = await loadImage(photoSrc);

        ctx.save();
        // Apply filter to photo slot
        if (filterConfig && filterConfig.css !== 'none') {
          ctx.filter = filterConfig.css;
        }

        // Clip to slot boundary with slight round corner if desired
        ctx.beginPath();
        ctx.rect(slot.x, slot.y, slot.width, slot.height);
        ctx.clip();

        if (mirror) {
          ctx.translate(slot.x + slot.width, slot.y);
          ctx.scale(-1, 1);
          drawImageCover(ctx, photoImg, 0, 0, slot.width, slot.height);
        } else {
          drawImageCover(ctx, photoImg, slot.x, slot.y, slot.width, slot.height);
        }

        ctx.restore();
      } catch (err) {
        console.warn(`Could not render photo in slot ${slot.order}:`, err);
      }
    }
  }

  // 3. Render the Frame Overlay PNG on TOP of the photos
  ctx.filter = 'none';
  ctx.drawImage(frameImg, 0, 0, canvasW, canvasH);

  // 4. Render user stickers if any
  if (stickers && stickers.length > 0) {
    for (const sticker of stickers) {
      const sx = (sticker.x / 100) * canvasW;
      const sy = (sticker.y / 100) * canvasH;
      const size = (sticker.size || 80) * (canvasW / 1000);

      ctx.save();
      ctx.font = `${size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(sx, sy);
      if (sticker.rotation) {
        ctx.rotate((sticker.rotation * Math.PI) / 180);
      }
      ctx.fillText(sticker.emoji || '✨', 0, 0);
      ctx.restore();
    }
  }

  // 5. Render custom text or timestamp if provided
  if (customText) {
    ctx.save();
    ctx.font = `600 ${Math.floor(canvasW * 0.024)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6;
    ctx.textAlign = 'center';
    ctx.fillText(customText, canvasW / 2, canvasH - 25);
    ctx.restore();
  }

  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Generates sample mock portraits for testing without physical camera
 */
export function generateMockPhoto(index = 1, theme = 'party') {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  const gradients = [
    ['#f43f5e', '#8b5cf6'],
    ['#06b6d4', '#3b82f6'],
    ['#f59e0b', '#ef4444'],
    ['#10b981', '#06b6d4']
  ];

  const [c1, c2] = gradients[(index - 1) % gradients.length];
  const grad = ctx.createLinearGradient(0, 0, 800, 600);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 600);

  // Draw avatar portrait silhouette / fun face
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  // Head
  ctx.beginPath();
  ctx.arc(400, 240, 110, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders
  ctx.beginPath();
  ctx.ellipse(400, 520, 240, 180, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cute face features
  ctx.fillStyle = '#1e293b';
  // Eyes
  ctx.beginPath();
  ctx.arc(360, 220, 12, 0, Math.PI * 2);
  ctx.arc(440, 220, 12, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(400, 245, 45, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();

  // Cheeks
  ctx.fillStyle = 'rgba(255, 100, 150, 0.6)';
  ctx.beginPath();
  ctx.arc(335, 255, 18, 0, Math.PI * 2);
  ctx.arc(465, 255, 18, 0, Math.PI * 2);
  ctx.fill();

  // Overlay Pose badge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(20, 20, 200, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`SNAP #${index}`, 40, 52);

  return canvas.toDataURL('image/jpeg', 0.9);
}
