import { DomainError } from '../../domain/errors.js';

/** What the kiosk needs to run an event: its settings plus the frames customers may use. */
export class GetKioskEvent {
  constructor({ eventRepository, frameCatalog }) {
    this.eventRepository = eventRepository;
    this.frameCatalog = frameCatalog;
  }

  async execute(eventId) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) throw new DomainError('Event not found', 404);

    const frames = await this.frameCatalog.findActiveByIds(event.referencedFrameIds());
    if (frames.length === 0) throw new DomainError('This event has no active frames', 409);

    // Public payload: never expose the owner's id.
    const { user_id: _owner, ...publicEvent } = event.toPublic();
    
    // Also fetch the vendor's settings
    const { SettingsModel } = await import('../../infrastructure/database/models/SettingsModel.js');
    let settings = await SettingsModel.findOne({ user_id: event.userId }).lean();
    if (!settings) {
      settings = {
        studioName: 'Studio Booth',
        countdownSeconds: 3,
        autoPrint: false,
        copiesCount: 1,
        enableStickers: true,
        enableFilters: true,
        printLayout: '4x6'
      };
    }

    return { ...publicEvent, frames, settings };
  }
}
