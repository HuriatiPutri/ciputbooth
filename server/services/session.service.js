import fs from 'fs';
import path from 'path';
import { TransactionModel } from '../infrastructure/database/models/TransactionModel.js';
import { EventModel } from '../infrastructure/database/models/EventModel.js';
import { PATHS, PORT } from '../config/constants.js';
import { getLocalIpAddress } from '../config/network.js';

export class SessionService {
  static async getSessions(user) {
    const query = { status: 'success' };
    if (user && user.role !== 'admin') {
      query.user_id = user.id;
    }
    const sessions = await TransactionModel.find(query).sort({ created_at: -1 }).lean();
    return sessions.map(session => ({
      ...session,
      id: session._id.toString(),
      composite_url: session.photo_url
    }));
  }

  static async getSessionById(id) {
    const session = await TransactionModel.findById(id).lean();
    if (!session) return null;

    const localIp = getLocalIpAddress();
    const photos = Array.isArray(session.photos)
      ? session.photos.map((p) => (p.startsWith('http') ? p : `http://${localIp}:${PORT}${p}`))
      : [];

    return {
      ...session,
      id: session._id.toString(),
      composite_url: session.photo_url,
      photos,
      share_url: `http://${localIp}:${PORT}/share/${session._id}`,
      download_url: session.photo_url ? `http://${localIp}:${PORT}${session.photo_url}` : ''
    };
  }

  static async createSession({ event_id, frame_id, frame_name, composite_base64, photos, filter_applied, copies, order_id }) {
    const now = new Date();
    
    // Default fallback values for legacy/missing event_id
    let user_id = 'default_user';
    let safeEventId = event_id || 'default_event';
    let amount = 0;

    if (event_id) {
      const event = await EventModel.findById(event_id).lean();
      if (event) {
        user_id = event.user_id.toString();
        amount = event.price_per_photo || 0;
      }
    } else {
      // In a real environment, we'd throw. For fallback, find an admin.
      const mongoose = await import('mongoose');
      const User = mongoose.model('User');
      const defaultUser = await User.findOne({ role: 'admin' });
      if (defaultUser) {
        user_id = defaultUser._id.toString();
      }
    }

    const sessionObjId = new (await import('mongoose')).Types.ObjectId();
    const sessionIdStr = sessionObjId.toString();

    // Create dedicated session folder matching the Markdown Spec
    // /uploads/users/{user_id}/events/{event_id}/sessions/{session_id}
    const relativeDir = `/users/${user_id}/events/${safeEventId}/sessions/${sessionIdStr}`;
    const absoluteDir = path.join(PATHS.UPLOADS_DIR, relativeDir);
    
    if (!fs.existsSync(absoluteDir)) {
      fs.mkdirSync(absoluteDir, { recursive: true });
    }

    let photo_url = '';

    // Save composite framed strip
    if (composite_base64 && composite_base64.startsWith('data:image/')) {
      const base64Data = composite_base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = 'composite.png';
      const filePath = path.join(absoluteDir, filename);
      fs.writeFileSync(filePath, buffer);
      photo_url = `/uploads${relativeDir}/${filename}`;
    }

    // Save individual raw/taken photos inside the session folder
    const savedPhotos = [];
    if (Array.isArray(photos)) {
      photos.forEach((photoDataUrl, idx) => {
        if (typeof photoDataUrl === 'string' && photoDataUrl.startsWith('data:image/')) {
          const photoBase64 = photoDataUrl.replace(/^data:image\/\w+;base64,/, '');
          const photoBuffer = Buffer.from(photoBase64, 'base64');
          const photoFilename = `shot_${idx + 1}.png`;
          const photoPath = path.join(absoluteDir, photoFilename);
          fs.writeFileSync(photoPath, photoBuffer);
          savedPhotos.push(`/uploads${relativeDir}/${photoFilename}`);
        } else if (typeof photoDataUrl === 'string') {
          savedPhotos.push(photoDataUrl);
        }
      });
    }

    // Save to Database via TransactionModel
    let transaction;
    if (order_id) {
      transaction = await TransactionModel.findOneAndUpdate(
        { order_id: order_id },
        {
          photos: savedPhotos,
          photo_url,
          frame_id: frame_id || null,
          filter_applied: filter_applied || 'normal',
          copies: copies || 1,
          status: 'success'
        },
        { new: true }
      );
    }
    
    // If no order_id or transaction not found, create a new one
    if (!transaction) {
      transaction = new TransactionModel({
        _id: sessionObjId,
        event_id: event_id || sessionObjId, // Fallback to itself if no event (for legacy)
        user_id,
        amount,
        status: 'success', // Photo captured successfully
        photo_url,
        photos: savedPhotos,
        frame_id: frame_id || null,
        filter_applied: filter_applied || 'normal',
        copies: copies || 1
      });
      await transaction.save();
    }

    const localIp = getLocalIpAddress();
    const share_url = `http://${localIp}:${PORT}/share/${sessionIdStr}`;
    const download_url = photo_url ? `http://${localIp}:${PORT}${photo_url}` : '';

    return {
      ...transaction.toObject(),
      id: sessionIdStr,
      composite_url: photo_url,
      share_url,
      download_url
    };
  }

  static async deleteSession(id, user) {
    const query = { _id: id };
    if (user && user.role !== 'admin') {
      query.user_id = user.id;
    }
    const deleted = await TransactionModel.findOneAndDelete(query);
    if (!deleted) {
      const error = new Error('Session not found');
      error.statusCode = 404;
      throw error;
    }

    // Remove dedicated session folder from disk
    const relativeDir = `/users/${deleted.user_id}/events/${deleted.event_id}/sessions/${id}`;
    const absoluteDir = path.join(PATHS.UPLOADS_DIR, relativeDir);
    
    if (fs.existsSync(absoluteDir)) {
      try {
        fs.rmSync(absoluteDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Could not remove session directory:', absoluteDir);
      }
    }

    return true;
  }
}
