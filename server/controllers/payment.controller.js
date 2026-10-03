import { useCases } from '../container.js';

export class PaymentController {
  static async createTransaction(req, res, next) {
    try {
      const { eventId, returnUrl } = req.body;
      const result = await useCases.createPaymentTransaction.execute({ eventId, returnUrl });
      
      const { TransactionModel } = await import('../infrastructure/database/models/TransactionModel.js');
      
      // Save pending transaction to DB
      await TransactionModel.create({
        event_id: eventId,
        user_id: result.user_id, // The event owner
        amount: result.amount,
        status: 'pending',
        order_id: result.order_id
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Webhook for Midtrans notifications
  static async webhook(req, res, next) {
    try {
      const {
        order_id,
        status_code,
        gross_amount,
        signature_key,
        transaction_status,
        fraud_status
      } = req.body;

      const { ENV } = await import('../config/env.js');
      const crypto = await import('crypto');

      // Verify signature
      const hash = crypto.createHash('sha512')
        .update(`${order_id}${status_code}${gross_amount}${ENV.MIDTRANS_SERVER_KEY}`)
        .digest('hex');

      if (hash !== signature_key) {
        console.warn('Invalid Midtrans Signature Key');
        return res.status(403).json({ success: false, message: 'Invalid signature key' });
      }

      // Update Transaction in DB
      const { TransactionModel } = await import('../infrastructure/database/models/TransactionModel.js');
      
      let newStatus = 'pending';
      if (transaction_status === 'capture' || transaction_status === 'settlement') {
        if (fraud_status === 'challenge') {
          newStatus = 'challenge';
        } else {
          newStatus = 'success';
        }
      } else if (
        transaction_status === 'cancel' ||
        transaction_status === 'deny' ||
        transaction_status === 'expire'
      ) {
        newStatus = 'failed';
      }

      await TransactionModel.findOneAndUpdate(
        { order_id: order_id },
        { status: newStatus },
        { new: true }
      );
      
      res.status(200).json({ success: true, message: 'Notification processed' });
    } catch (error) {
      next(error);
    }
  }

  // Poll status from frontend
  static async getTransactionStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const { useCases } = await import('../container.js');
      const { paymentGateway } = useCases.createPaymentTransaction;
      
      const midtransClient = await import('midtrans-client');
      const { ENV } = await import('../config/env.js');
      
      const core = new midtransClient.default.CoreApi({
        isProduction: ENV.MIDTRANS_IS_PRODUCTION,
        serverKey: ENV.MIDTRANS_SERVER_KEY,
        clientKey: ENV.MIDTRANS_CLIENT_KEY
      });

      const statusResponse = await core.transaction.status(orderId);
      
      res.json({
        success: true,
        data: {
          transaction_status: statusResponse.transaction_status,
          order_id: statusResponse.order_id
        }
      });
    } catch (error) {
      // If 404 (not found yet in Midtrans), just return pending
      if (error.httpStatusCode === 404) {
        return res.json({ success: true, data: { transaction_status: 'pending' } });
      }
      next(error);
    }
  }
}
