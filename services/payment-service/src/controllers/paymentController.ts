import { Request, Response } from 'express';
import { stripeService } from '../services/stripeService';
import { db } from '../config/database';
import { transactions, paymentMethods } from '../models/schema';
import { logger } from '../utils/logger';

export const paymentController = {
  async createPaymentIntent(req: Request, res: Response) {
    try {
      const { amount, currency, type, metadata } = req.body;
      const userId = (req as any).user.id;
      const tenantId = (req as any).user.tenantId;

      const intent = await stripeService.createPaymentIntent(amount, currency || 'EGP', metadata);

      const [transaction] = await db.insert(transactions).values({
        userId,
        amount: amount.toString(),
        currency: currency || 'EGP',
        status: 'pending',
        type,
        provider: 'stripe',
        providerTransactionId: intent.id,
        metadata,
        tenantId
      }).returning();

      res.json({ success: true, data: { ...intent, transactionId: transaction.id } });
    } catch (error) {
      logger.error('Create payment intent error:', error);
      res.status(500).json({ success: false, error: 'Failed to create payment intent' });
    }
  },

  async confirmPayment(req: Request, res: Response) {
    try {
      const { paymentIntentId, paymentMethodId } = req.body;

      const result = await stripeService.confirmPayment(paymentIntentId, paymentMethodId);

      await db.update(transactions)
        .set({ status: 'completed' })
        .where({ providerTransactionId: paymentIntentId });

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Confirm payment error:', error);
      res.status(500).json({ success: false, error: 'Failed to confirm payment' });
    }
  },

  async getTransactionHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const tenantId = (req as any).user.tenantId;

      const history = await db.select().from(transactions)
        .where({ userId, tenantId })
        .orderBy({ createdAt: 'desc' });

      res.json({ success: true, data: history });
    } catch (error) {
      logger.error('Get transaction history error:', error);
      res.status(500).json({ success: false, error: 'Failed to get transaction history' });
    }
  }
};
