import mongoose from 'mongoose';
import { TransactionModel } from '../../../infrastructure/database/models/TransactionModel.js';

export class ReportController {
  static async getRevenueReport(req, res, next) {
    try {
      // Everyone only sees their own revenue (even admins)
      const userId = req.user.id;

      const pipeline = [
        {
          // Step 1 & 2: Match valid transactions for the current user
          $match: {
            user_id: new mongoose.Types.ObjectId(userId),
            status: 'success'
          }
        },
        {
          // Step 3 & 4: Group by event_id, calculate sum and count
          $group: {
            _id: '$event_id',
            total_revenue: { $sum: '$amount' },
            total_sessions: { $sum: 1 }
          }
        },
        {
          // Step 5: Lookup the event details to get the name
          $lookup: {
            from: 'events',
            localField: '_id',
            foreignField: '_id',
            as: 'event_details'
          }
        },
        {
          // Flatten the array from lookup
          $unwind: {
            path: '$event_details',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          // Format the final output
          $project: {
            _id: 0,
            event_id: '$_id',
            event_name: { $ifNull: ['$event_details.event_name', 'Unknown Event'] },
            total_revenue: 1,
            total_sessions: 1
          }
        },
        {
          // Sort by highest revenue
          $sort: { total_revenue: -1 }
        }
      ];

      const report = await TransactionModel.aggregate(pipeline);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
}

