/**
 * Payment Webhook Service
 * Handle webhooks from payment providers (Stripe, PayPal)
 */

import { db } from '../config/database';
import { transactions } from '../models/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  provider: 'stripe' | 'paypal';
}

class WebhookService {
  async handleStripeWebhook(event: WebhookEvent): Promise<void> {
    try {
      logger.info(`Processing Stripe webhook: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data);
          break;

        case 'charge.refunded':
          await this.handleRefund(event.data);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePayment(event.data);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data);
          break;

        default:
          logger.warn(`Unhandled Stripe webhook type: ${event.type}`);
      }

      logger.info(`Stripe webhook processed: ${event.id}`);
    } catch (error) {
      logger.error('Stripe webhook processing failed:', error);
      throw error;
    }
  }

  async handlePayPalWebhook(event: WebhookEvent): Promise<void> {
    try {
      logger.info(`Processing PayPal webhook: ${event.type}`);

      switch (event.type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentSuccess(event.data);
          break;

        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePaymentFailure(event.data);
          break;

        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handleRefund(event.data);
          break;

        default:
          logger.warn(`Unhandled PayPal webhook type: ${event.type}`);
      }

      logger.info(`PayPal webhook processed: ${event.id}`);
    } catch (error) {
      logger.error('PayPal webhook processing failed:', error);
      throw error;
    }
  }

  private async handlePaymentSuccess(data: any): Promise<void> {
    try {
      const transactionId = data.metadata?.transactionId || data.id;

      await db.update(transactions)
        .set({
          status: 'succeeded',
          updatedAt: new Date()
        })
        .where(eq(transactions.id, transactionId));

      logger.info(`Payment succeeded: ${transactionId}`);

      // TODO: Send confirmation email
      // TODO: Update order status
    } catch (error) {
      logger.error('Failed to handle payment success:', error);
      throw error;
    }
  }

  private async handlePaymentFailure(data: any): Promise<void> {
    try {
      const transactionId = data.metadata?.transactionId || data.id;

      await db.update(transactions)
        .set({
          status: 'failed',
          metadata: { ...data.metadata, failureReason: data.failure_message },
          updatedAt: new Date()
        })
        .where(eq(transactions.id, transactionId));

      logger.info(`Payment failed: ${transactionId}`);

      // TODO: Send failure notification
    } catch (error) {
      logger.error('Failed to handle payment failure:', error);
      throw error;
    }
  }

  private async handleRefund(data: any): Promise<void> {
    try {
      const transactionId = data.payment_intent || data.id;

      await db.update(transactions)
        .set({
          status: 'refunded',
          metadata: { ...data.metadata, refundId: data.refund?.id },
          updatedAt: new Date()
        })
        .where(eq(transactions.id, transactionId));

      logger.info(`Refund processed: ${transactionId}`);

      // TODO: Send refund confirmation
    } catch (error) {
      logger.error('Failed to handle refund:', error);
      throw error;
    }
  }

  private async handleSubscriptionCreated(data: any): Promise<void> {
    try {
      logger.info(`Subscription created: ${data.id}`);
      // TODO: Update subscription status in database
    } catch (error) {
      logger.error('Failed to handle subscription creation:', error);
      throw error;
    }
  }

  private async handleSubscriptionUpdated(data: any): Promise<void> {
    try {
      logger.info(`Subscription updated: ${data.id}`);
      // TODO: Update subscription details
    } catch (error) {
      logger.error('Failed to handle subscription update:', error);
      throw error;
    }
  }

  private async handleSubscriptionCancelled(data: any): Promise<void> {
    try {
      logger.info(`Subscription cancelled: ${data.id}`);
      // TODO: Update subscription status to cancelled
    } catch (error) {
      logger.error('Failed to handle subscription cancellation:', error);
      throw error;
    }
  }

  private async handleInvoicePayment(data: any): Promise<void> {
    try {
      logger.info(`Invoice payment succeeded: ${data.id}`);
      // TODO: Mark invoice as paid
    } catch (error) {
      logger.error('Failed to handle invoice payment:', error);
      throw error;
    }
  }

  private async handleInvoicePaymentFailed(data: any): Promise<void> {
    try {
      logger.info(`Invoice payment failed: ${data.id}`);
      // TODO: Send payment failure notification
    } catch (error) {
      logger.error('Failed to handle invoice payment failure:', error);
      throw error;
    }
  }

  async verifyWebhookSignature(payload: string, signature: string, secret: string, provider: 'stripe' | 'paypal'): Promise<boolean> {
    try {
      if (provider === 'stripe') {
        // In production, use Stripe's signature verification
        // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        // stripe.webhooks.constructEvent(payload, signature, secret);
        return true;
      } else if (provider === 'paypal') {
        // In production, use PayPal's signature verification
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }
}

export const webhookService = new WebhookService();
