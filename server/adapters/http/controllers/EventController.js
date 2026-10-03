import { useCases } from '../../../container.js';

export class EventController {
  static async list(req, res, next) {
    try {
      res.json({ success: true, data: await useCases.listEvents.execute(req.user) });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const event = await useCases.createEvent.execute(req.user, req.body);
      res.status(201).json({ success: true, data: event.toPublic() });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const event = await useCases.updateEvent.execute(req.user, req.params.id, req.body);
      res.json({ success: true, data: event.toPublic() });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req, res, next) {
    try {
      await useCases.deleteEvent.execute(req.user, req.params.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  /** Public: used by the kiosk (no login). */
  static async kiosk(req, res, next) {
    try {
      res.json({ success: true, data: await useCases.getKioskEvent.execute(req.params.id) });
    } catch (err) {
      next(err);
    }
  }
}
