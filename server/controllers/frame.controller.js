import { FrameService } from '../services/frame.service.js';

export class FrameController {
  static async getAll(req, res, next) {
    try {
      const onlyActive = req.query.active === 'true';
      const frames = await FrameService.getFrames(req.user, onlyActive);
      res.json({ success: true, count: frames.length, data: frames });
    } catch (error) {
      next(error);
    }
  }

  static async getPublic(req, res, next) {
    try {
      // Fetch only active admin frames for public Kiosk
      const frames = await FrameService.getFrames(null, true);
      const adminFrames = frames.filter(f => f.is_admin_frame);
      res.json({ success: true, count: adminFrames.length, data: adminFrames });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const frame = await FrameService.getFrameById(req.params.id, req.user);
      if (!frame) {
        return res.status(404).json({ success: false, message: 'Frame not found' });
      }
      res.json({ success: true, data: frame });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      console.log('req', req)
      const newFrame = await FrameService.createFrame(req.body, req.file, req.user);
      res.status(201).json({ success: true, message: 'Frame created successfully', data: newFrame });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const updated = await FrameService.updateFrame(req.params.id, req.body, req.file, req.user);
      res.json({ success: true, message: 'Frame updated successfully', data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      await FrameService.deleteFrame(req.params.id, req.user);
      res.json({ success: true, message: 'Frame deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
