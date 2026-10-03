import { DomainError } from '../../domain/errors.js';
import { assertCanManage, buildEventSettings } from './eventRules.js';

export class UpdateEvent {
  constructor({ eventRepository, frameCatalog }) {
    this.eventRepository = eventRepository;
    this.frameCatalog = frameCatalog;
  }

  async execute(actor, eventId, input) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) throw new DomainError('Event not found', 404);
    assertCanManage(event, actor);

    const settings = await buildEventSettings(input, this.frameCatalog, actor);
    Object.assign(event, settings);
    return this.eventRepository.update(event);
  }
}
