import { FrameModel } from '../database/models/FrameModel.js';
import mongoose from 'mongoose';

export class LegacyFrameCatalog {
  async findMissing(ids, actor) {
    const strIds = ids.map(id => id.toString());
    const validIds = strIds.filter(id => mongoose.isValidObjectId(id));
    
    const query = { _id: { $in: validIds } };
    if (actor && actor.role !== 'admin') {
      const { UserModel } = await import('../database/models/UserModel.js');
      const admin = await UserModel.findOne({ role: 'admin' }).select('_id').lean();
      if (admin) {
        query.$or = [{ user_id: actor.id }, { user_id: admin._id }];
      } else {
        query.user_id = actor.id;
      }
    }
    
    const foundFrames = await FrameModel.find(query).lean();
    const foundIds = foundFrames.map(f => f._id.toString());
    
    // Return any IDs that were not found
    return strIds.filter(id => !foundIds.includes(id));
  }

  async findActiveByIds(ids, actor) {
    const validIds = ids.filter(id => mongoose.isValidObjectId(id));
    const query = { _id: { $in: validIds }, is_active: true };
    if (actor && actor.role !== 'admin') {
      const { UserModel } = await import('../database/models/UserModel.js');
      const admin = await UserModel.findOne({ role: 'admin' }).select('_id').lean();
      if (admin) {
        query.$or = [{ user_id: actor.id }, { user_id: admin._id }];
      } else {
        query.user_id = actor.id;
      }
    }
    return await FrameModel.find(query).lean();
  }
}
