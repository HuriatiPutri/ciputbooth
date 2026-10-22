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

      // Broadcast new session via socket so open Session Gallery updates in real-time
      try {
        const { getIO } = await import('../socket.js');
        const io = getIO();
        io.emit('new_session', session);
      } catch (e) {
        // Socket broadcast optional
      }

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

      // Broadcast session deletion via socket
      try {
        const { getIO } = await import('../socket.js');
        const io = getIO();
        io.emit('delete_session', { id: req.params.id });
      } catch (e) {
        // Socket broadcast optional
      }

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
