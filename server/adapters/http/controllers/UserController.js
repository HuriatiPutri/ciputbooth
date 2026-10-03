import { useCases } from '../../../container.js';

export class UserController {
  static async list(req, res, next) {
    try {
      res.json({ success: true, data: await useCases.listUsers.execute() });
    } catch (err) {
      next(err);
    }
  }

  static async stats(req, res, next) {
    try {
      const { repositories } = await import('../../../container.js');
      const { TransactionModel } = await import('../../../infrastructure/database/models/TransactionModel.js');
      
      const users = await repositories.userRepository.findAll();
      const activeUsersCount = users.filter(u => u.isActive).length;
      const totalSessions = await TransactionModel.countDocuments();
      
      res.json({ 
        success: true, 
        data: { activeUsers: activeUsersCount, totalSessions } 
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const user = await useCases.registerUser.execute(req.body);
      res.status(201).json({ success: true, data: user.toPublic() });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      // For simple management, we can use repository directly if no complex business logic needed
      const { repositories } = await import('../../../container.js');
      const updatedUser = await repositories.userRepository.update(req.params.id, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      res.json({ success: true, data: updatedUser.toPublic() });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const { repositories } = await import('../../../container.js');
      const success = await repositories.userRepository.delete(req.params.id);
      
      if (!success) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}
