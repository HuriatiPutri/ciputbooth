import { Event } from '../../domain/entities/Event.js';
import { buildEventSettings } from './eventRules.js';

export class CreateEvent {
  constructor({ eventRepository, frameCatalog }) {
    this.eventRepository = eventRepository;
    this.frameCatalog = frameCatalog;
  }

  async execute(actor, input) {
    const settings = await buildEventSettings(input, this.frameCatalog, actor);
    return this.eventRepository.create(new Event({ userId: actor.id, ...settings }));
  }
}
