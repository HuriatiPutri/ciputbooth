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
  if (!img) return;

  // HTMLVideoElement uses videoWidth/videoHeight, HTMLImageElement uses naturalWidth/naturalHeight
  const imgW = img.naturalWidth || img.videoWidth || img.width || 0;
  const imgH = img.naturalHeight || img.videoHeight || img.height || 0;

  if (!imgW || !imgH || isNaN(imgW) || isNaN(imgH)) {
    try {
      ctx.drawImage(img, targetX, targetY, targetW, targetH);
    } catch (e) {
      // ignore
    }
    return;
  }

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

  try {
    ctx.drawImage(img, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);
  } catch (err) {
    try {
      ctx.drawImage(img, targetX, targetY, targetW, targetH);
    } catch (e) {
      // ignore
    }
  }
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
    // Map to specific captured photo: support photo_index (1-based), falling back to slot.order or i
    const targetIndex = slot.photo_index !== undefined && slot.photo_index !== null
      ? (Number(slot.photo_index) - 1)
      : (slot.order !== undefined && slot.order !== null ? Number(slot.order) - 1 : i);
    const photoSrc = photos[targetIndex] || photos[i % (photos.length || 1)] || photos[0];

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

/**
 * Returns the highest quality and most compatible supported video mime type
 */
export function getSupportedVideoMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return '';
}

/**
 * Generates an animated mock video clip for mock camera mode testing
 */
export async function generateMockLiveClip(index = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  const stream = canvas.captureStream(30);
  const mimeType = getSupportedVideoMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    let frameCount = 0;
    const maxFrames = 60; // 2 seconds at 30fps

    const drawMockFrame = () => {
      frameCount++;
      const progress = frameCount / maxFrames;
      const bounce = Math.sin(progress * Math.PI * 4) * 20;

      // Dynamic vibrant background
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, index % 2 === 0 ? '#ec4899' : '#8b5cf6');
      grad.addColorStop(1, index % 2 === 0 ? '#8b5cf6' : '#06b6d4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // Bouncing avatar
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(320, 200 + bounce, 90, 0, Math.PI * 2);
      ctx.fill();

      // Emoji/eyes
      ctx.font = '50px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(index === 1 ? '😎' : index === 2 ? '✌️' : '✨', 320, 220 + bounce);

      // Motion banner
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(20, 20, 220, 44);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`LIVE MOTION #${index}`, 35, 48);

      if (frameCount < maxFrames) {
        requestAnimationFrame(drawMockFrame);
      } else {
        recorder.stop();
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    };

    recorder.start(100);
    drawMockFrame();
  });
}

/**
 * Composites recorded live motion video clips into frame slots and overlays the frame PNG
 * to generate a downloadable video strip (Live Picture).
 */
export async function generateLiveCompositeVideo({
  frame,
  liveClips = [],
  photos = [],
  filterId = 'normal',
  stickers = [],
  customText = '',
  durationMs = 3500
}) {
  if (!frame) throw new Error('Frame is required for live composite');

  const frameImg = await loadImage(frame.image_url);
  const canvasW = frame.width || frameImg.naturalWidth || 1200;
  const canvasH = frame.height || frameImg.naturalHeight || 1800;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  const sortedSlots = [...(frame.photo_slots || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const filterConfig = FILTERS.find((f) => f.id === filterId) || FILTERS[0];

  // Hidden container to ensure browser decodes and plays video frames for canvas drawImage
  const hiddenContainer = document.createElement('div');
  hiddenContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
  document.body.appendChild(hiddenContainer);

  // Initialize media elements for each slot
  const slotElements = await Promise.all(
    sortedSlots.map(async (slot, idx) => {
      const targetIndex = slot.photo_index !== undefined && slot.photo_index !== null
        ? (Number(slot.photo_index) - 1)
        : (slot.order !== undefined && slot.order !== null ? Number(slot.order) - 1 : idx);

      const clipSrc = liveClips[targetIndex] || liveClips[idx % (liveClips.length || 1)] || (liveClips.length > 0 ? liveClips[0] : null);
      const photoSrc = photos[targetIndex] || photos[idx % (photos.length || 1)] || photos[0];
      const photoImg = photoSrc ? await loadImage(photoSrc).catch(() => null) : null;

      let video = null;
      if (clipSrc) {
        video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.defaultMuted = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        hiddenContainer.appendChild(video);

        await new Promise((resolve) => {
          let resolved = false;
          const done = () => {
            if (!resolved) {
              resolved = true;
              video.play().catch(() => {});
              resolve();
            }
          };

          video.onloadeddata = done;
          video.oncanplay = done;
          video.onerror = done;
          video.src = clipSrc;

          setTimeout(done, 1500); // 1.5s max wait
        });
      }

      return { video, photoImg, slot };
    })
  );

  const mimeType = getSupportedVideoMimeType();
  const stream = canvas.captureStream(30);
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    let animId = null;
    const startTime = Date.now();

    const drawFrame = () => {
      // 1. Solid canvas background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // 2. Draw each slot with filter applied
      for (const item of slotElements) {
        if (!item) continue;
        const { video, photoImg, slot } = item;
        ctx.save();
        if (filterConfig && filterConfig.css !== 'none') {
          ctx.filter = filterConfig.css;
        }
        ctx.beginPath();
        ctx.rect(slot.x, slot.y, slot.width, slot.height);
        ctx.clip();

        // Step 2a: Draw base photo first so slot is NEVER blank/white
        if (photoImg) {
          drawImageCover(ctx, photoImg, slot.x, slot.y, slot.width, slot.height);
        }

        // Step 2b: Draw live video frame on top if available and playing
        if (video && video.videoWidth > 0 && video.readyState >= 2) {
          drawImageCover(ctx, video, slot.x, slot.y, slot.width, slot.height);
        }

        ctx.restore();
      }

      // 3. Frame Overlay PNG
      ctx.filter = 'none';
      ctx.drawImage(frameImg, 0, 0, canvasW, canvasH);

      // 4. Stickers
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

      // 5. Custom Text Watermark
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

      if (Date.now() - startTime < durationMs) {
        animId = requestAnimationFrame(drawFrame);
      } else {
        recorder.stop();
      }
    };

    recorder.onstop = () => {
      cancelAnimationFrame(animId);
      // Clean up and remove hidden video elements
      slotElements.forEach((item) => {
        if (item && item.video) {
          item.video.pause();
          item.video.removeAttribute('src');
          item.video.load();
        }
      });
      if (hiddenContainer.parentNode) {
        hiddenContainer.parentNode.removeChild(hiddenContainer);
      }

      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    };

    recorder.start(100);
    drawFrame();
  });
}

