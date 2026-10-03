export class ListEvents {
  constructor({ eventRepository }) {
    this.eventRepository = eventRepository;
  }

  /** Admins see every event, vendors only their own. */
  async execute(actor) {
    const events = actor.isAdmin()
      ? await this.eventRepository.findAll()
      : await this.eventRepository.findByUserId(actor.id);
    return events.map((event) => event.toPublic());
  }
}
