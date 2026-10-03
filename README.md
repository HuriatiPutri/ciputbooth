# CiputBooth - Dynamic Frame Photobooth System 📸✨

A modern, fullstack self-service Photobooth Kiosk and Management System designed for photo studios, events, and kiosks with **Dynamic Frame Selection**, **Visual Coordinates Configurator**, **Live Camera Countdown**, and **Instant Print / QR Code sharing**.

---

## 🌟 Key Features

### 1. 🖥️ Touchscreen Kiosk Experience (User Flow)
- **Attract Screen**: Modern neon-glassmorphism animated welcome screen with "Touch to Start".
- **Dynamic Frame Selection**:
  - Live API fetch (`GET /api/frames?active=true`).
  - Interactive swipeable carousel and responsive grid.
  - Visual preview of slot counts, aspect ratio, and photo positions.
  - Filter tabs (All Frames, 2x6 Strips, 4x6 Cards).
- **Live Camera Booth & Countdown**:
  - Real-time webcam integration with mirror mode support.
  - Simulated Studio Camera mode fallback for testing.
  - 3..2..1 countdown with synthesized audio beeps and screen flash effect.
  - Pose inspiration and shot progress tracking.
- **Customization Studio**:
  - Real-time canvas compositing behind transparent PNG frame overlays.
  - Color filters: *Noir B&W, Vintage 90s, Golden Glow, Cyber Blue, Sakura Dream, Studio Dramatic*.
  - Fun drag-and-drop / tap-to-place sticker overlay props.
  - Customizable studio text captions and timestamps.
  - Single-shot retake or retake all options.
- **Result & Instant Print Screen**:
  - Confetti burst celebration.
  - Instant thermal / photo printer trigger (`window.print()` formatted for 2x6 and 4x6 borderless photo paper).
  - Dynamic QR Code generation for customer smartphone scanning & direct download.
  - HD PNG file download button and auto-reset inactivity timer.

### 2. 🎛️ Admin Dashboard (Template & Studio Management)
- **Visual Frame Coordinates Editor**:
  - Upload transparent PNG frame overlays.
  - Interactive visual canvas: drag to move bounding boxes and drag corner/edge handles to resize photo slots.
  - Direct coordinate inputs (`x`, `y`, `width`, `height`, `order`).
  - Live preview toggle showing dummy portrait photos placed in slots behind the frame.
  - Quick layout presets (2x6 3-Strip, 4x6 4-Grid, 4x6 2-Duo).
- **Frame Templates Management**:
  - Enable / disable frames without deleting files.
  - Edit coordinates, modify sizes, or delete frame templates.
  - Pre-seeded with default studio frames (Classic Noir Strip, Minimalist Ivory Strip, Y2K Cyber 4-Grid, Pastel Sunset Duo).
- **Customer Captures Gallery**:
  - View all past photobooth print sessions.
  - Instant reprint and download capabilities.
- **Studio Hardware Settings**:
  - Customize studio name, countdown timer duration, default print size, and prop toggles.

---

## 🏗️ Architecture & Database Schema

### Database Structure (`server/data/db.json`)
```json
{
  "id": "frame_classic_black_01",
  "name": "Classic Noir Strip",
  "image_url": "/uploads/frames/classic_strip_black.png",
  "is_active": true,
  "print_size": "2x6",
  "description": "Timeless vintage black photo strip with 3 portrait shots",
  "width": 600,
  "height": 1800,
  "photo_slots": [
    { "order": 1, "x": 50, "y": 80, "width": 500, "height": 380 },
    { "order": 2, "x": 50, "y": 500, "width": 500, "height": 380 },
    { "order": 3, "x": 50, "y": 920, "width": 500, "height": 380 }
  ]
}
```

---

## 🚀 Running the Application

### 1. Start Both Frontend & Backend (Recommended)
```bash
npm run dev
```

- **Kiosk Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

### 2. Admin Access
Click the **Settings icon** on the top header of the Kiosk (or enter PIN `1234` or leave blank).
