import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { TransactionModel } from '../infrastructure/database/models/TransactionModel.js';
import { EventModel } from '../infrastructure/database/models/EventModel.js';
import { UserModel } from '../infrastructure/database/models/UserModel.js';
import { SettingsModel } from '../infrastructure/database/models/SettingsModel.js';
import { tokenService } from './token.service.js';
import { cloudUploadService } from './cloud-upload.service.js';
import { PATHS, PORT } from '../config/constants.js';
import { getLocalIpAddress } from '../config/network.js';
import { db } from '../db.js';
import GIFEncoder from 'gif-encoder-2';
import { Jimp } from 'jimp';

function parseDataUrl(dataUrl, defaultExt = 'bin') {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return {
      buffer: Buffer.from(dataUrl, 'base64'),
      ext: defaultExt
    };
  }
  const header = dataUrl.slice(0, commaIdx).toLowerCase();
  const rawBase64 = dataUrl.slice(commaIdx + 1);
  const buffer = Buffer.from(rawBase64, 'base64');

  let ext = defaultExt;
  if (header.includes('mp4')) ext = 'mp4';
  else if (header.includes('webm')) ext = 'webm';
  else if (header.includes('png')) ext = 'png';
  else if (header.includes('jpeg') || header.includes('jpg')) ext = 'jpg';
  else if (header.includes('gif')) ext = 'gif';

  return { buffer, ext, header };
}

export class SessionService {
  static async getSessions(user) {
    const isMongoConnected = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
    let mongoSessions = [];
    const eventsMap = new Map();

    if (isMongoConnected) {
      try {
        const query = { status: 'success' };
        if (user && user.role !== 'admin') {
          query.user_id = user.id;
        }
        mongoSessions = await TransactionModel.find(query).sort({ created_at: -1 }).lean();

        const allEvents = await EventModel.find().lean();
        for (const ev of allEvents) {
          eventsMap.set(String(ev._id), ev.event_name);
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch sessions from MongoDB:', err.message);
      }
    }

    let localSessions = [];
    try {
      localSessions = db.getSessions();
    } catch (err) {
      console.warn('⚠️ Could not fetch sessions from local database:', err.message);
    }

    const localIp = getLocalIpAddress();
    const httpPort = process.env.HTTP_PORT || 3002;

    const seenIds = new Set();
    const merged = [];

    // Prioritize latest local sessions
    for (const session of localSessions) {
      const sId = String(session.id || session._id);
      if (!sId || seenIds.has(sId)) continue;
      seenIds.add(sId);

      const rawEventId = session.event_id || 'default_event';
      const eventIdStr = String(rawEventId);
      const eventName = session.event_name || eventsMap.get(eventIdStr) || (eventIdStr === 'default_event' ? 'General / Default Event' : 'Event ' + eventIdStr.slice(-6));
      const compositeUrl = session.composite_url || session.photo_url || '';
      merged.push({
        ...session,
        id: sId,
        event_id: eventIdStr,
        event_name: eventName,
        composite_url: compositeUrl,
        photo_url: compositeUrl,
        frame_name: session.frame_name || 'Photo Strip',
        gif_url: session.gif_url || '',
        live_photo_url: session.live_photo_url || '',
        share_url: session.share_url || `http://${localIp}:${httpPort}/share/${sId}`,
        download_url: session.download_url || (compositeUrl ? `http://${localIp}:${httpPort}${compositeUrl}` : '')
      });
    }

    // Include MongoDB sessions
    for (const session of mongoSessions) {
      const sId = String(session._id || session.id);
      if (!sId || seenIds.has(sId)) continue;
      seenIds.add(sId);

      const rawEventId = session.event_id || 'default_event';
      const eventIdStr = String(rawEventId);
      const eventName = session.event_name || eventsMap.get(eventIdStr) || (eventIdStr === 'default_event' ? 'General / Default Event' : 'Event ' + eventIdStr.slice(-6));
      const compositeUrl = session.photo_url || session.composite_url || '';
      merged.push({
        ...session,
        id: sId,
        event_id: eventIdStr,
        event_name: eventName,
        composite_url: compositeUrl,
        photo_url: compositeUrl,
        frame_name: session.frame_name || 'Photo Strip',
        gif_url: session.gif_url || '',
        live_photo_url: session.live_photo_url || '',
        share_url: `http://${localIp}:${httpPort}/share/${sId}`,
        download_url: compositeUrl ? `http://${localIp}:${httpPort}${compositeUrl}` : ''
      });
    }

    // Sort descending by date
    merged.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return merged;
  }

  static async getSessionById(id) {
    const isMongoConnected = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
    let session = null;

    if (isMongoConnected && mongoose.isValidObjectId(id)) {
      try {
        session = await TransactionModel.findById(id).lean();
      } catch (err) {
        console.warn('⚠️ Could not query session by ID from MongoDB:', err.message);
      }
    }

    if (!session) {
      try {
        session = db.getSessionById(id);
      } catch (err) {
        console.warn('⚠️ Could not query session by ID from local database:', err.message);
      }
    }

    if (!session) return null;

    const sId = String(session._id || session.id || id);
    const localIp = getLocalIpAddress();
    const httpPort = process.env.HTTP_PORT || 3002;
    const compositeUrl = session.photo_url || session.composite_url || '';

    // Ensure session has an active secure token
    let activeToken = session.secure_token;
    if (!activeToken) {
      try {
        const tokenRes = await tokenService.createSessionToken(sId);
        activeToken = tokenRes.rawToken;
        session.secure_token = activeToken;
        session.token_expires_at = tokenRes.expiresAt;
      } catch (e) {
        console.warn('Could not lazily generate secure token:', e.message);
      }
    }

    let globalSettings = null;
    if (mongoose.connection?.readyState === 1) {
      try {
        globalSettings = await SettingsModel.findOne({ type: 'user' }).lean();
      } catch (e) {}
    }
    if (!globalSettings) {
      globalSettings = db.getSettings();
    }

    let publicDomain = (globalSettings?.publicShareDomain || '').trim();
    if (publicDomain && !/^https?:\/\//i.test(publicDomain)) {
      publicDomain = `https://${publicDomain}`;
    }
    publicDomain = publicDomain.replace(/\/+$/, '');

    const baseHost = publicDomain || `http://${localIp}:${httpPort}`;
    const share_url = activeToken
      ? `${baseHost}/share/${activeToken}`
      : `${baseHost}/share/${sId}`;

    const photos = Array.isArray(session.photos)
      ? session.photos.map((p) => {
          if (typeof p !== 'string') return '';
          if (p.startsWith('http') || p.startsWith('data:')) return p;
          return `http://${localIp}:${httpPort}${p}`;
        })
      : [];
    const liveClips = Array.isArray(session.live_clips)
      ? session.live_clips.map((c) => {
          if (typeof c !== 'string') return '';
          if (c.startsWith('http') || c.startsWith('data:')) return c;
          return `http://${localIp}:${httpPort}${c}`;
        })
      : [];

    return {
      ...session,
      id: sId,
      frame_name: session.frame_name || 'Photo Strip',
      composite_url: compositeUrl,
      photo_url: compositeUrl,
      gif_url: session.gif_url || '',
      live_photo_url: session.live_photo_url || '',
      photos,
      live_clips: liveClips,
      share_url: share_url,
      download_url: compositeUrl ? `http://${localIp}:${httpPort}${compositeUrl}` : '',
      download_gif_url: session.gif_url ? `http://${localIp}:${httpPort}${session.gif_url}` : '',
      download_live_url: session.live_photo_url ? `http://${localIp}:${httpPort}${session.live_photo_url}` : ''
    };
  }

  static async createSession({ event_id, frame_id, frame_name, composite_base64, live_composite_base64, photos, live_clips, filter_applied, copies, order_id }) {
    const now = new Date();
    const isMongoConnected = Boolean(mongoose.connection && mongoose.connection.readyState === 1);

    // Default fallback values
    let user_id = 'default_user';
    let safeEventId = event_id || 'default_event';
    let amount = 0;
    let event_name = 'General / Default Event';

    if (isMongoConnected) {
      try {
        if (event_id && mongoose.isValidObjectId(event_id)) {
          const event = await EventModel.findById(event_id).lean();
          if (event) {
            user_id = event.user_id.toString();
            amount = event.price_per_photo || 0;
            event_name = event.event_name;
          }
        } else {
          const defaultUser = await UserModel.findOne({ role: 'admin' }).lean();
          if (defaultUser) {
            user_id = defaultUser._id.toString();
          }
        }
      } catch (err) {
        console.warn('⚠️ Error resolving user/event from MongoDB, using fallback:', err.message);
      }
    }

    const sessionObjId = new mongoose.Types.ObjectId();
    const sessionIdStr = sessionObjId.toString();

    // Create dedicated session folder matching the Markdown Spec
    // /uploads/users/{user_id}/events/{event_id}/sessions/{session_id}
    const relativeDir = `/users/${user_id}/events/${safeEventId}/sessions/${sessionIdStr}`;
    const absoluteDir = path.join(PATHS.UPLOADS_DIR, relativeDir);

    if (!fs.existsSync(absoluteDir)) {
      fs.mkdirSync(absoluteDir, { recursive: true });
    }

    let photo_url = '';

    // Save composite framed strip (Regular Picture)
    if (composite_base64 && typeof composite_base64 === 'string') {
      const parsed = parseDataUrl(composite_base64, 'png');
      if (parsed && parsed.buffer.length > 0) {
        const filename = `composite.${parsed.ext}`;
        const filePath = path.join(absoluteDir, filename);
        fs.writeFileSync(filePath, parsed.buffer);
        photo_url = `/uploads${relativeDir}/${filename}`;
      }
    }

    // Save live composite video (Live Picture)
    let live_photo_url = '';
    if (live_composite_base64 && typeof live_composite_base64 === 'string') {
      const parsed = parseDataUrl(live_composite_base64, 'mp4');
      if (parsed && parsed.buffer.length > 0) {
        const filename = `composite_live.${parsed.ext}`;
        const filePath = path.join(absoluteDir, filename);
        fs.writeFileSync(filePath, parsed.buffer);
        live_photo_url = `/uploads${relativeDir}/${filename}`;
      }
    }

    // Save individual raw/taken photos inside the session folder
    const savedPhotos = [];
    const absolutePhotoPaths = [];
    if (Array.isArray(photos)) {
      photos.forEach((photoDataUrl, idx) => {
        if (typeof photoDataUrl === 'string' && photoDataUrl.startsWith('data:')) {
          const parsed = parseDataUrl(photoDataUrl, 'jpg');
          if (parsed && parsed.buffer.length > 0) {
            const photoFilename = `shot_${idx + 1}.${parsed.ext}`;
            const photoPath = path.join(absoluteDir, photoFilename);
            fs.writeFileSync(photoPath, parsed.buffer);
            savedPhotos.push(`/uploads${relativeDir}/${photoFilename}`);
            absolutePhotoPaths.push(photoPath);
          }
        } else if (typeof photoDataUrl === 'string') {
          savedPhotos.push(photoDataUrl);
        }
      });
    }

    // Save individual live movement clips
    const savedLiveClips = [];
    if (Array.isArray(live_clips)) {
      live_clips.forEach((clipDataUrl, idx) => {
        if (typeof clipDataUrl === 'string' && clipDataUrl.startsWith('data:')) {
          const parsed = parseDataUrl(clipDataUrl, 'mp4');
          if (parsed && parsed.buffer.length > 0) {
            const clipFilename = `live_clip_${idx + 1}.${parsed.ext}`;
            const clipPath = path.join(absoluteDir, clipFilename);
            fs.writeFileSync(clipPath, parsed.buffer);
            savedLiveClips.push(`/uploads${relativeDir}/${clipFilename}`);
          }
        } else if (typeof clipDataUrl === 'string') {
          savedLiveClips.push(clipDataUrl);
        }
      });
    }

    let gif_url = '';
    if (absolutePhotoPaths.length > 0) {
      try {
        const gifWidth = 600;
        const gifHeight = 400;
        const encoder = new GIFEncoder(gifWidth, gifHeight);
        encoder.start();
        encoder.setRepeat(0);
        encoder.setDelay(500);
        encoder.setQuality(10);

        for (const p of absolutePhotoPaths) {
          const image = await Jimp.read(p);
          image.resize({ w: gifWidth, h: gifHeight });
          encoder.addFrame(image.bitmap.data);
        }

        encoder.finish();
        const gifBuffer = encoder.out.getData();
        const gifFilename = 'animation.gif';
        const gifPath = path.join(absoluteDir, gifFilename);
        fs.writeFileSync(gifPath, gifBuffer);
        gif_url = `/uploads${relativeDir}/${gifFilename}`;
      } catch (err) {
        console.error('Error generating GIF:', err);
      }
    }

    const tokenData = await tokenService.createSessionToken(sessionIdStr);

    let globalSettings = null;
    if (isMongoConnected) {
      try {
        globalSettings = await SettingsModel.findOne({ type: 'user' }).lean();
      } catch (e) {}
    }
    if (!globalSettings) {
      globalSettings = db.getSettings();
    }

    const localIp = getLocalIpAddress();
    const httpPort = process.env.HTTP_PORT || 3002;
    let publicDomain = (globalSettings?.publicShareDomain || '').trim();
    if (publicDomain && !/^https?:\/\//i.test(publicDomain)) {
      publicDomain = `https://${publicDomain}`;
    }
    publicDomain = publicDomain.replace(/\/+$/, '');

    const baseHost = publicDomain || `http://${localIp}:${httpPort}`;
    const share_url = `${baseHost}/share/${tokenData.rawToken}`;
    const download_url = photo_url ? `http://${localIp}:${httpPort}${photo_url}` : '';
    const download_gif_url = gif_url ? `http://${localIp}:${httpPort}${gif_url}` : '';
    const download_live_url = live_photo_url ? `http://${localIp}:${httpPort}${live_photo_url}` : '';

    // ALWAYS save to local database so Customer Gallery has the session immediately
    const localSessionData = {
      id: sessionIdStr,
      user_id,
      event_id: safeEventId,
      event_name,
      amount,
      status: 'success',
      photo_url,
      composite_url: photo_url,
      live_photo_url,
      live_clips: savedLiveClips,
      gif_url,
      photos: savedPhotos,
      frame_id: frame_id || null,
      frame_name: frame_name || 'Photo Strip',
      filter_applied: filter_applied || 'normal',
      copies: copies || 1,
      order_id: order_id || null,
      share_url,
      download_url,
      download_gif_url,
      download_live_url,
      secure_token: tokenData.rawToken,
      secure_token_hash: tokenData.tokenHash,
      token_expires_at: tokenData.expiresAt.toISOString(),
      drive_upload_status: 'pending',
      drive_files: [],
      created_at: now.toISOString()
    };

    try {
      db.createSession(localSessionData);
    } catch (dbErr) {
      console.warn('⚠️ Could not save session to local database:', dbErr);
    }

    // Trigger asynchronous Google Drive upload
    cloudUploadService.uploadSessionPhotos(localSessionData, absoluteDir).catch((e) => {
      console.error('Background Google Drive upload error:', e.message);
    });

    // Also persist to MongoDB if connected
    if (isMongoConnected) {
      try {
        let transaction = null;
        if (order_id) {
          transaction = await TransactionModel.findOneAndUpdate(
            { order_id: order_id },
            {
              photos: savedPhotos,
              photo_url,
              live_photo_url,
              live_clips: savedLiveClips,
              gif_url,
              frame_id: frame_id || null,
              frame_name: frame_name || 'Photo Strip',
              filter_applied: filter_applied || 'normal',
              copies: copies || 1,
              status: 'success',
              secure_token: tokenData.rawToken,
              secure_token_hash: tokenData.tokenHash,
              token_expires_at: tokenData.expiresAt,
              drive_upload_status: 'pending',
              drive_files: []
            },
            { new: true }
          );
        }

        if (!transaction) {
          transaction = new TransactionModel({
            _id: sessionObjId,
            event_id: safeEventId,
            event_name,
            user_id,
            amount,
            status: 'success',
            photo_url,
            live_photo_url,
            live_clips: savedLiveClips,
            gif_url,
            photos: savedPhotos,
            frame_id: frame_id || null,
            frame_name: frame_name || 'Photo Strip',
            filter_applied: filter_applied || 'normal',
            copies: copies || 1,
            secure_token: tokenData.rawToken,
            secure_token_hash: tokenData.tokenHash,
            token_expires_at: tokenData.expiresAt,
            drive_upload_status: 'pending',
            drive_files: []
          });
          await transaction.save();
        }
      } catch (mongoErr) {
        console.warn('⚠️ Could not save transaction to MongoDB (session was safely stored locally):', mongoErr.message);
      }
    }

    return {
      ...localSessionData,
      id: sessionIdStr
    };
  }

  static async deleteSession(id, user) {
    let deleted = false;

    // Remove from local database
    try {
      deleted = db.deleteSession(id);
    } catch (err) {
      console.warn('⚠️ Could not delete session from local database:', err);
    }

    // Remove from MongoDB if connected
    const isMongoConnected = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
    if (isMongoConnected) {
      try {
        const query = { _id: id };
        if (user && user.role !== 'admin') {
          query.user_id = user.id;
        }
        const mongoDeleted = await TransactionModel.findOneAndDelete(query);
        if (mongoDeleted) deleted = true;
      } catch (err) {
        console.warn('⚠️ Could not delete session from MongoDB:', err);
      }
    }

    // Remove dedicated session folder from disk
    const searchDirs = [
      path.join(PATHS.UPLOADS_DIR, 'sessions', id),
      path.join(PATHS.UPLOADS_DIR, 'users')
    ];

    for (const sDir of searchDirs) {
      if (fs.existsSync(sDir)) {
        if (sDir.endsWith(id)) {
          try {
            fs.rmSync(sDir, { recursive: true, force: true });
          } catch (e) {
            console.warn('Could not remove session directory:', sDir);
          }
        } else {
          // Recursive find of session directory in users folder
          try {
            const findAndRemove = (current) => {
              const entries = fs.readdirSync(current, { withFileTypes: true });
              for (const entry of entries) {
                const full = path.join(current, entry.name);
                if (entry.isDirectory()) {
                  if (entry.name === id) {
                    fs.rmSync(full, { recursive: true, force: true });
                    return true;
                  }
                  findAndRemove(full);
                }
              }
              return false;
            };
            findAndRemove(sDir);
          } catch (e) {
            // Ignore scan errors
          }
        }
      }
    }

    return true;
  }
}

