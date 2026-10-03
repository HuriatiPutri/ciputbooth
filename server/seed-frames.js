import fs from 'fs';
import path from 'path';
import { createPng } from './generate-png.js';
import { db, FRAMES_DIR } from './db.js';

export function seedDefaultFrames() {
  const existing = db.getFrames();
  if (existing.length > 0) {
    console.log(`Database already has ${existing.length} frames.`);
    return;
  }

  console.log('Seeding initial frames with transparent PNG overlays...');

  // 1. Classic 3-Photo Black Strip (600 x 1800 px)
  {
    const width = 600;
    const height = 1800;
    const slots = [
      { order: 1, x: 50, y: 80, width: 500, height: 380 },
      { order: 2, x: 50, y: 500, width: 500, height: 380 },
      { order: 3, x: 50, y: 920, width: 500, height: 380 }
    ];

    const pngBuffer = createPng(width, height, (x, y) => {
      // Check if inside any slot (transparent cutout)
      for (const slot of slots) {
        if (x >= slot.x && x < slot.x + slot.width && y >= slot.y && y < slot.y + slot.height) {
          // Inside slot = completely transparent!
          return [0, 0, 0, 0];
        }
      }

      // Check slot borders (thin white line 2px around each slot)
      for (const slot of slots) {
        const borderDist = 4;
        const outerX = slot.x - borderDist;
        const outerY = slot.y - borderDist;
        const outerW = slot.width + borderDist * 2;
        const outerH = slot.height + borderDist * 2;
        if (x >= outerX && x < outerX + outerW && y >= outerY && y < outerY + outerH) {
          return [255, 255, 255, 180]; // Semi-transparent white border
        }
      }

      // Frame background: Deep sleek matte charcoal black with subtle noise/dots
      if (y > 1350) {
        // Bottom logo / footer section
        const isDecorativeLine = (y === 1420 || y === 1720) && (x >= 80 && x <= 520);
        if (isDecorativeLine) return [212, 175, 55, 220]; // Gold accent line
        return [18, 18, 22, 255];
      }

      return [15, 15, 18, 255];
    });

    const filename = 'classic_strip_black.png';
    fs.writeFileSync(path.join(FRAMES_DIR, filename), pngBuffer);

    db.createFrame({
      id: 'frame_classic_black_01',
      name: 'Classic Noir Strip',
      image_url: `/uploads/frames/${filename}`,
      is_active: true,
      print_size: '2x6',
      description: 'Timeless vintage black photo strip with 3 portrait shots',
      width,
      height,
      photo_slots: slots
    });
  }

  // 2. Minimalist Warm White Strip (600 x 1800 px)
  {
    const width = 600;
    const height = 1800;
    const slots = [
      { order: 1, x: 50, y: 80, width: 500, height: 380 },
      { order: 2, x: 50, y: 500, width: 500, height: 380 },
      { order: 3, x: 50, y: 920, width: 500, height: 380 }
    ];

    const pngBuffer = createPng(width, height, (x, y) => {
      for (const slot of slots) {
        if (x >= slot.x && x < slot.x + slot.width && y >= slot.y && y < slot.y + slot.height) {
          return [0, 0, 0, 0]; // Transparent
        }
      }

      // Inner shadow / subtle dark stroke
      for (const slot of slots) {
        const d = 3;
        if (x >= slot.x - d && x < slot.x + slot.width + d && y >= slot.y - d && y < slot.y + slot.height + d) {
          return [220, 215, 205, 255];
        }
      }

      // Warm ivory white background
      return [250, 248, 245, 255];
    });

    const filename = 'minimal_strip_white.png';
    fs.writeFileSync(path.join(FRAMES_DIR, filename), pngBuffer);

    db.createFrame({
      id: 'frame_minimal_white_02',
      name: 'Minimalist Ivory Strip',
      image_url: `/uploads/frames/${filename}`,
      is_active: true,
      print_size: '2x6',
      description: 'Clean, bright aesthetic with warm ivory borders',
      width,
      height,
      photo_slots: slots
    });
  }

  // 3. Cyber Neon 4-Grid Card (1200 x 1800 px) - 4 photos
  {
    const width = 1200;
    const height = 1800;
    const slots = [
      { order: 1, x: 80, y: 80, width: 490, height: 600 },
      { order: 2, x: 630, y: 80, width: 490, height: 600 },
      { order: 3, x: 80, y: 720, width: 490, height: 600 },
      { order: 4, x: 630, y: 720, width: 490, height: 600 }
    ];

    const pngBuffer = createPng(width, height, (x, y) => {
      for (const slot of slots) {
        if (x >= slot.x && x < slot.x + slot.width && y >= slot.y && y < slot.y + slot.height) {
          return [0, 0, 0, 0]; // Transparent
        }
      }

      // Neon glowing border around slots
      for (const slot of slots) {
        const d = 5;
        if (x >= slot.x - d && x < slot.x + slot.width + d && y >= slot.y - d && y < slot.y + slot.height + d) {
          // Cyberpunk gradient: cyan to purple
          const ratio = (x + y) / (width + height);
          const r = Math.floor(0 + ratio * 240);
          const g = Math.floor(220 - ratio * 150);
          const b = Math.floor(255);
          return [r, g, b, 255];
        }
      }

      // Dark futuristic slate background
      return [15, 17, 26, 255];
    });

    const filename = 'y2k_cyber_neon.png';
    fs.writeFileSync(path.join(FRAMES_DIR, filename), pngBuffer);

    db.createFrame({
      id: 'frame_cyber_neon_03',
      name: 'Y2K Cyber 4-Grid',
      image_url: `/uploads/frames/${filename}`,
      is_active: true,
      print_size: '4x6',
      description: '4-Grid layout with electric cyber glow accents',
      width,
      height,
      photo_slots: slots
    });
  }

  // 4. Pastel Sunset Duo (1200 x 1800 px) - 2 large shots
  {
    const width = 1200;
    const height = 1800;
    const slots = [
      { order: 1, x: 100, y: 120, width: 1000, height: 680 },
      { order: 2, x: 100, y: 860, width: 1000, height: 680 }
    ];

    const pngBuffer = createPng(width, height, (x, y) => {
      for (const slot of slots) {
        if (x >= slot.x && x < slot.x + slot.width && y >= slot.y && y < slot.y + slot.height) {
          return [0, 0, 0, 0]; // Transparent
        }
      }

      // Pastel gradient background: Soft Peach to Rose Pink
      const ratio = y / height;
      const r = Math.floor(255 - ratio * 20);
      const g = Math.floor(225 - ratio * 60);
      const b = Math.floor(215 + ratio * 15);

      return [r, g, b, 255];
    });

    const filename = 'pastel_sunset_duo.png';
    fs.writeFileSync(path.join(FRAMES_DIR, filename), pngBuffer);

    db.createFrame({
      id: 'frame_pastel_duo_04',
      name: 'Pastel Sunset Duo',
      image_url: `/uploads/frames/${filename}`,
      is_active: true,
      print_size: '4x6',
      description: '2 large cinematic landscape shots with warm pastel gradient',
      width,
      height,
      photo_slots: slots
    });
  }

  console.log('Seeded 4 default dynamic frames successfully!');
}
