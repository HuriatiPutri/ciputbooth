import { ValidationError } from '../errors.js';

export const PAYMENT_TYPES = Object.freeze({ PAID: 'paid', FREE: 'free' });
export const PHOTO_FLOWS = Object.freeze({ CHOOSE_FRAME: 'choose_frame', DEFAULT_FRAME: 'default_frame' });

export class Event {
  constructor({
    id = null,
    userId,
    eventName,
    paymentType = PAYMENT_TYPES.FREE,
    pricePerPhoto = 0,
    photoFlow = PHOTO_FLOWS.CHOOSE_FRAME,
    availableFrames = [],
    defaultFrameId = null,
    createdAt = null
  }) {
    this.id = id;
    this.userId = userId;
    this.eventName = eventName;
    this.paymentType = paymentType;
    this.pricePerPhoto = pricePerPhoto;
    this.photoFlow = photoFlow;
    this.availableFrames = availableFrames;
    this.defaultFrameId = defaultFrameId;
    this.createdAt = createdAt;
  }

  /** Normalises raw input into a consistent, valid set of event settings or throws ValidationError. */
  static sanitize(input) {
    const eventName = String(input.event_name ?? '').trim();
    if (!eventName) throw new ValidationError('Event name is required');

    const paymentType = input.payment_type ?? PAYMENT_TYPES.FREE;
    if (!Object.values(PAYMENT_TYPES).includes(paymentType)) throw new ValidationError('Invalid payment type');

    const pricePerPhoto = paymentType === PAYMENT_TYPES.PAID ? Number(input.price_per_photo) : 0;
    if (paymentType === PAYMENT_TYPES.PAID && !(pricePerPhoto > 0)) {
      throw new ValidationError('Paid events need a price greater than 0');
    }

    const photoFlow = input.photo_flow ?? PHOTO_FLOWS.CHOOSE_FRAME;
    if (!Object.values(PHOTO_FLOWS).includes(photoFlow)) throw new ValidationError('Invalid photo flow');

    let availableFrames = [];
    let defaultFrameId = null;

    if (photoFlow === PHOTO_FLOWS.DEFAULT_FRAME) {
      defaultFrameId = input.default_frame_id || null;
      if (!defaultFrameId) throw new ValidationError('Choose a default frame for this flow');
    } else {
      availableFrames = [...new Set(Array.isArray(input.available_frames) ? input.available_frames : [])];
      if (availableFrames.length === 0) throw new ValidationError('Select at least one available frame');
    }

    return { eventName, paymentType, pricePerPhoto, photoFlow, availableFrames, defaultFrameId };
  }

  /** Frame ids that the event depends on, whichever flow is used. */
  referencedFrameIds() {
    return this.photoFlow === PHOTO_FLOWS.DEFAULT_FRAME ? [this.defaultFrameId] : this.availableFrames;
  }

  isOwnedBy(user) {
    return user.isAdmin() || this.userId === user.id;
  }

  toPublic() {
    return {
      id: this.id,
      user_id: this.userId,
      event_name: this.eventName,
      payment_type: this.paymentType,
      price_per_photo: this.pricePerPhoto,
      photo_flow: this.photoFlow,
      available_frames: this.availableFrames,
      default_frame_id: this.defaultFrameId,
      created_at: this.createdAt
    };
  }
}
