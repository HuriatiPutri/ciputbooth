import { DomainError } from '../../domain/errors.js';
import { assertCanManage } from './eventRules.js';

export class DeleteEvent {
  constructor({ eventRepository }) {
    this.eventRepository = eventRepository;
  }

  async execute(actor, eventId) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) throw new DomainError('Event not found', 404);
    assertCanManage(event, actor);
    await this.eventRepository.delete(eventId);
  }
}
