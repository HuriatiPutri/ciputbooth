import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event_name: { type: String, required: true, trim: true },
    payment_type: { type: String, enum: ['paid', 'free'], default: 'free', required: true },
    price_per_photo: { type: Number, default: 0, min: 0 },
    photo_flow: { type: String, enum: ['choose_frame', 'default_frame'], default: 'choose_frame', required: true },
    available_frames: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Frame', default: [] }],
    default_frame_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Frame', default: null }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'events' }
);

export const EventModel = mongoose.models.Event || mongoose.model('Event', eventSchema);
