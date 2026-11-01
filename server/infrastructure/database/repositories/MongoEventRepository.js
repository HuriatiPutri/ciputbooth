import mongoose from 'mongoose';
import { Event } from '../../../domain/entities/Event.js';
import { EventModel } from '../models/EventModel.js';

function toEntity(doc) {
  if (!doc) return null;
  return new Event({
    id: doc._id.toString(),
    userId: doc.user_id.toString(),
    eventName: doc.event_name,
    paymentType: doc.payment_type,
    pricePerPhoto: doc.price_per_photo,
    photoFlow: doc.photo_flow,
    availableFrames: doc.available_frames,
    defaultFrameId: doc.default_frame_id,
    enableLivePicture: doc.enable_live_picture !== undefined ? doc.enable_live_picture : true,
    createdAt: doc.created_at
  });
}

function toDocument(event) {
  return {
    user_id: event.userId,
    event_name: event.eventName,
    payment_type: event.paymentType,
    price_per_photo: event.pricePerPhoto,
    photo_flow: event.photoFlow,
    available_frames: event.availableFrames,
    default_frame_id: event.defaultFrameId,
    enable_live_picture: event.enableLivePicture
  };
}

export class MongoEventRepository {
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return toEntity(await EventModel.findById(id));
  }

  async findAll() {
    return (await EventModel.find().sort({ created_at: -1 })).map(toEntity);
  }

  async findByUserId(userId) {
    return (await EventModel.find({ user_id: userId }).sort({ created_at: -1 })).map(toEntity);
  }

  async create(event) {
    return toEntity(await EventModel.create(toDocument(event)));
  }

  async update(event) {
    return toEntity(await EventModel.findByIdAndUpdate(event.id, toDocument(event), { new: true }));
  }

  async delete(id) {
    await EventModel.findByIdAndDelete(id);
  }
}
