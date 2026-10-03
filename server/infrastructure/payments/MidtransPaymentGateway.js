import midtransClient from 'midtrans-client';
import { ENV } from '../../config/env.js';
import { v4 as uuidv4 } from 'uuid';

export class MidtransPaymentGateway {
  constructor() {
    this.snap = new midtransClient.Snap({
      isProduction: ENV.MIDTRANS_IS_PRODUCTION,
      serverKey: ENV.MIDTRANS_SERVER_KEY,
      clientKey: ENV.MIDTRANS_CLIENT_KEY
    });
  }

  /**
   * Create a transaction using Midtrans Snap API.
   * @param {Object} params
   * @param {number} params.amount - Gross amount to be charged
   * @param {string} params.itemName - Event name or item name
   * @returns {Promise<{token: string, redirect_url: string, order_id: string}>}
   */
  async createTransaction({ amount, itemName, returnUrl }) {
    const orderId = `ORDER-${Date.now()}-${uuidv4().split('-')[0]}`;
    
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      item_details: [{
        id: 'PHOTO_SESSION',
        price: amount,
        quantity: 1,
        name: itemName
      }]
    };

    if (returnUrl) {
      parameter.callbacks = {
        finish: returnUrl
      };
    }

    const transaction = await this.snap.createTransaction(parameter);
    return {
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId
    };
  }
}
