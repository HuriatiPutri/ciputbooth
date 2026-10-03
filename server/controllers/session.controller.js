import { SessionService } from '../services/session.service.js';
import { renderSharePage, renderNotFoundPage } from '../views/share-page.template.js';

export class SessionController {
  static async getAll(req, res, next) {
    try {
      const sessions = await SessionService.getSessions(req.user);
      res.json({ success: true, count: sessions.length, data: sessions });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const session = await SessionService.getSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }
      res.json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const session = await SessionService.createSession(req.body);
      res.status(201).json({
        success: true,
        message: 'Session saved successfully',
        data: session
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      await SessionService.deleteSession(req.params.id, req.user);
      res.json({ success: true, message: 'Session deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async renderShare(req, res, next) {
    try {
      const session = await SessionService.getSessionById(req.params.id);
      if (!session || !session.composite_url) {
        return res.status(404).send(renderNotFoundPage());
      }
      res.send(renderSharePage(session));
    } catch (error) {
      next(error);
    }
  }
}
