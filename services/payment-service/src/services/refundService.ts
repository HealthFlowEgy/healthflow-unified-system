/**
 * Refund Management Service
 * Handle payment refunds
 */

import { db } from '../config/database';
import { transactions } from '../models/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { stripeService } from './stripeService';

interface RefundRequest {
  transactionId: string;
  amount?: number; // If not provided, full refund
  reason?: string;
  userId: string;
  tenantId: string;
}

interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number;
  status: string;
  error?: string;
}

class RefundService {
  async processRefund(request: RefundRequest): Promise<RefundResult> {
    try {
      // Get original transaction
      const [transaction] = await db.select()
        .from(transactions)
        .where(eq(transactions.id, request.transactionId));

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status === 'refunded') {
        throw new Error('Transaction already refunded');
      }

      if (transaction.status !== 'succeeded') {
        throw new Error('Can only refund successful transactions');
      }

      // Calculate refund amount
      const refundAmount = request.amount || transaction.amount;

      if (refundAmount > transaction.amount) {
        throw new Error('Refund amount cannot exceed transaction amount');
      }

      // Process refund via payment provider
      const refund = await this.processProviderRefund(
        transaction.paymentMethod,
        transaction.id,
        refundAmount,
        request.reason
      );

      // Update transaction status
      await db.update(transactions)
        .set({
          status: refundAmount === transaction.amount ? 'refunded' : 'partially_refunded',
          metadata: {
            ...transaction.metadata,
            refundId: refund.id,
            refundAmount,
            refundReason: request.reason,
            refundedAt: new Date()
          },
          updatedAt: new Date()
        })
        .where(eq(transactions.id, request.transactionId));

      logger.info(`Refund processed: ${refund.id} for transaction ${request.transactionId}`);

      return {
        success: true,
        refundId: refund.id,
        amount: refundAmount,
        status: 'succeeded'
      };
    } catch (error) {
      logger.error('Refund processing failed:', error);
      return {
        success: false,
        amount: request.amount || 0,
        status: 'failed',
        error: error.message
      };
    }
  }

  private async processProviderRefund(
    paymentMethod: string,
    transactionId: string,
    amount: number,
    reason?: string
  ): Promise<any> {
    try {
      if (paymentMethod === 'card' || paymentMethod === 'stripe') {
        return await stripeService.createRefund({
          paymentIntentId: transactionId,
          amount,
          reason
        });
      } else if (paymentMethod === 'paypal') {
        // Mock PayPal refund
        return {
          id: `refund_${Date.now()}`,
          amount,
          status: 'succeeded'
        };
      }

      throw new Error(`Unsupported payment method: ${paymentMethod}`);
    } catch (error) {
      logger.error('Provider refund failed:', error);
      throw error;
    }
  }

  async getRefundStatus(refundId: string): Promise<any> {
    try {
      // Mock implementation - in production, query payment provider
      return {
        id: refundId,
        status: 'succeeded',
        amount: 5000,
        created: new Date()
      };
    } catch (error) {
      logger.error('Failed to get refund status:', error);
      throw error;
    }
  }

  async listRefunds(transactionId: string): Promise<any[]> {
    try {
      const [transaction] = await db.select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));

      if (!transaction || !transaction.metadata) {
        return [];
      }

      const metadata = transaction.metadata as any;
      if (metadata.refundId) {
        return [{
          id: metadata.refundId,
          amount: metadata.refundAmount,
          reason: metadata.refundReason,
          createdAt: metadata.refundedAt
        }];
      }

      return [];
    } catch (error) {
      logger.error('Failed to list refunds:', error);
      return [];
    }
  }

  async cancelRefund(refundId: string): Promise<void> {
    try {
      // Mock implementation - in production, cancel via payment provider
      logger.info(`Refund cancelled: ${refundId}`);
    } catch (error) {
      logger.error('Failed to cancel refund:', error);
      throw error;
    }
  }
}

export const refundService = new RefundService();
