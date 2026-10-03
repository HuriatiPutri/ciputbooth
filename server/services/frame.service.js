import { FrameModel } from '../infrastructure/database/models/FrameModel.js';
import { UserModel } from '../infrastructure/database/models/UserModel.js';

export class FrameService {
  static async getFrames(user, onlyActive = false) {
    const query = onlyActive ? { is_active: true } : {};
    
    // Always fetch admin to determine which frames belong to admin
    const admin = await UserModel.findOne({ role: 'admin' }).select('_id').lean();
    const adminIdStr = admin ? admin._id.toString() : null;

    if (user) {
      if (user.role === 'admin') {
        query.user_id = user.id;
      } else {
        if (admin) {
          query.$or = [{ user_id: user.id }, { user_id: admin._id }];
        } else {
          query.user_id = user.id;
        }
      }
    }
    const frames = await FrameModel.find(query).sort({ created_at: -1 }).lean();
    return frames.map(frame => ({
      ...frame,
      id: frame._id.toString(),
      is_admin_frame: adminIdStr === frame.user_id?.toString()
    }));
  }

  static async getFrameById(id, user) {
    const query = { _id: id };
    if (user) {
      if (user.role === 'admin') {
        query.user_id = user.id;
      } else {
        const admin = await UserModel.findOne({ role: 'admin' }).select('_id').lean();
        if (admin) {
          query.$or = [{ user_id: user.id }, { user_id: admin._id }];
        } else {
          query.user_id = user.id;
        }
      }
    }
    const frame = await FrameModel.findOne(query).lean();
    if (!frame) return null;
    return { ...frame, id: frame._id.toString() };
  }

  static async createFrame(data, file, user) {
    let photo_slots = [];
    if (data.photo_slots) {
      try {
        photo_slots = typeof data.photo_slots === 'string'
          ? JSON.parse(data.photo_slots)
          : data.photo_slots;
      } catch (e) {
        photo_slots = [];
      }
    }

    let image_url = data.image_url || '';
    if (file) {
      image_url = `/uploads/frames/${file.filename}`;
    }

    if (!image_url) {
      const error = new Error('Frame image is required (PNG format)');
      error.statusCode = 400;
      throw error;
    }

    let ownerId = user?.id;
    if (!ownerId) {
      const defaultUser = await UserModel.findOne({ role: 'admin' });
      if (!defaultUser) throw new Error('No admin user found to assign frame ownership.');
      ownerId = defaultUser._id;
    }

    const newFrame = new FrameModel({
      user_id: ownerId,
      name: data.name || 'Custom Studio Frame',
      image_url,
      print_size: data.print_size || '4x6',
      width: parseInt(data.width, 10) || 1200,
      height: parseInt(data.height, 10) || 1800,
      photo_slots,
      is_active: data.is_active === undefined ? true : data.is_active === 'true' || data.is_active === true
    });

    await newFrame.save();
    return { ...newFrame.toObject(), id: newFrame._id.toString() };
  }

  static async updateFrame(id, data, file, user) {
    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.is_active !== undefined) updateData.is_active = data.is_active === 'true' || data.is_active === true;
    if (data.print_size !== undefined) updateData.print_size = data.print_size;
    if (data.width !== undefined) updateData.width = parseInt(data.width, 10);
    if (data.height !== undefined) updateData.height = parseInt(data.height, 10);

    if (data.photo_slots !== undefined) {
      try {
        updateData.photo_slots = typeof data.photo_slots === 'string'
          ? JSON.parse(data.photo_slots)
          : data.photo_slots;
      } catch (e) {
        console.error('Failed to parse photo_slots JSON:', e);
      }
    }

    if (file) {
      updateData.image_url = `/uploads/frames/${file.filename}`;
    }

    const query = { _id: id };
    if (user && user.role !== 'admin') {
      query.user_id = user.id;
    }

    const updated = await FrameModel.findOneAndUpdate(query, updateData, { new: true }).lean();
    if (!updated) {
      const error = new Error('Frame not found');
      error.statusCode = 404;
      throw error;
    }

    return { ...updated, id: updated._id.toString() };
  }

  static async deleteFrame(id, user) {
    const query = { _id: id };
    if (user && user.role !== 'admin') {
      query.user_id = user.id;
    }

    const deleted = await FrameModel.findOneAndDelete(query);
    if (!deleted) {
      const error = new Error('Frame not found');
      error.statusCode = 404;
      throw error;
    }
    return true;
  }
}
