export class CreatePaymentTransaction {
  constructor({ eventRepository, paymentGateway }) {
    this.eventRepository = eventRepository;
    this.paymentGateway = paymentGateway;
  }

  async execute({ eventId, returnUrl }) {
    if (!eventId) {
      throw new Error('Event ID is required for payment');
    }

    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.paymentType !== 'paid') {
      throw new Error('This event does not require payment');
    }

    const amount = Number(event.pricePerPhoto);
    if (!amount || amount <= 0) {
      throw new Error('Invalid event price');
    }

    const transaction = await this.paymentGateway.createTransaction({
      amount: amount,
      itemName: `Photo Session - ${event.eventName}`,
      returnUrl: returnUrl
    });

    return { ...transaction, amount, user_id: event.userId };
  }
}
