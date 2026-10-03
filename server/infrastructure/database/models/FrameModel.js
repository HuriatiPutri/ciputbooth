import mongoose from 'mongoose';

const frameSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    image_url: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    print_size: { type: String, default: '4x6' },
    width: { type: Number, default: 1200 },
    height: { type: Number, default: 1800 },
    photo_slots: { type: Array, default: [] }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'frames' }
);

export const FrameModel = mongoose.models.Frame || mongoose.model('Frame', frameSchema);
