import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const FRAMES_DIR = path.join(UPLOADS_DIR, 'frames');
const SESSIONS_DIR = path.join(UPLOADS_DIR, 'sessions');

// Ensure directories exist
[DATA_DIR, UPLOADS_DIR, FRAMES_DIR, SESSIONS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const defaultData = {
  frames: [],
  sessions: [],
  settings: {
    studioName: 'Ciput Studio Booth',
    countdownSeconds: 3,
    autoPrint: false,
    copiesCount: 1,
    enableStickers: true,
    enableFilters: true,
    printLayout: '4x6'
  }
};

class Database {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.save(defaultData);
    }
  }

  load() {
    try {
      if (!fs.existsSync(DB_FILE)) {
        this.save(defaultData);
        return defaultData;
      }
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading db.json, falling back to default data:', err);
      return defaultData;
    }
  }

  save(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing to db.json:', err);
    }
  }

  // --- Frame Operations ---
  getFrames(onlyActive = false) {
    const data = this.load();
    let frames = data.frames || [];
    if (onlyActive) {
      frames = frames.filter((f) => f.is_active);
    }
    return frames;
  }

  getFrameById(id) {
    const data = this.load();
    return (data.frames || []).find((f) => f.id === id) || null;
  }

  createFrame(frameData) {
    const data = this.load();
    const newFrame = {
      id: frameData.id || `frame_${Date.now()}`,
      name: frameData.name || 'Untitled Frame',
      image_url: frameData.image_url || '',
      is_active: frameData.is_active !== undefined ? frameData.is_active : true,
      print_size: frameData.print_size || '4x6',
      description: frameData.description || '',
      width: frameData.width || 1200,
      height: frameData.height || 1800,
      photo_slots: Array.isArray(frameData.photo_slots) ? frameData.photo_slots : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.frames = data.frames || [];
    data.frames.push(newFrame);
    this.save(data);
    return newFrame;
  }

  updateFrame(id, updateData) {
    const data = this.load();
    data.frames = data.frames || [];
    const index = data.frames.findIndex((f) => f.id === id);
    if (index === -1) return null;

    data.frames[index] = {
      ...data.frames[index],
      ...updateData,
      id: data.frames[index].id, // preserve id
      updated_at: new Date().toISOString()
    };

    this.save(data);
    return data.frames[index];
  }

  deleteFrame(id) {
    const data = this.load();
    data.frames = data.frames || [];
    const frame = data.frames.find((f) => f.id === id);
    if (!frame) return false;

    data.frames = data.frames.filter((f) => f.id !== id);
    this.save(data);

    // Clean up file if local
    if (frame.image_url && frame.image_url.startsWith('/uploads/frames/')) {
      const filename = path.basename(frame.image_url);
      const filePath = path.join(FRAMES_DIR, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Could not remove file:', filePath);
        }
      }
    }
    return true;
  }

  // --- Session Operations ---
  getSessions() {
    const data = this.load();
    return (data.sessions || []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getSessionById(id) {
    const data = this.load();
    return (data.sessions || []).find((s) => s.id === id) || null;
  }

  createSession(sessionData) {
    const data = this.load();
    const newSession = {
      id: sessionData.id || `session_${Date.now()}`,
      frame_id: sessionData.frame_id,
      frame_name: sessionData.frame_name || 'Custom Frame',
      composite_url: sessionData.composite_url || '',
      photos: sessionData.photos || [],
      filter_applied: sessionData.filter_applied || 'normal',
      copies: sessionData.copies || 1,
      created_at: new Date().toISOString()
    };

    data.sessions = data.sessions || [];
    data.sessions.unshift(newSession);
    this.save(data);
    return newSession;
  }

  deleteSession(id) {
    const data = this.load();
    data.sessions = data.sessions || [];
    const session = data.sessions.find((s) => s.id === id);
    if (!session) return false;

    data.sessions = data.sessions.filter((s) => s.id !== id);
    this.save(data);
    return true;
  }

  // --- Settings ---
  getSettings() {
    const data = this.load();
    return data.settings || defaultData.settings;
  }

  updateSettings(newSettings) {
    const data = this.load();
    data.settings = { ...data.settings, ...newSettings };
    this.save(data);
    return data.settings;
  }
}

export const db = new Database();
export { FRAMES_DIR, SESSIONS_DIR, UPLOADS_DIR };
