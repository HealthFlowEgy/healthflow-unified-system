/**
 * Subscription Management Service
 * Handle recurring payments and subscriptions
 */

import { db } from '../config/database';
import { transactions } from '../models/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { stripeService } from './stripeService';

interface CreateSubscriptionData {
  userId: string;
  planId: string;
  paymentMethodId: string;
  tenantId: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

class SubscriptionService {
  private plans: Map<string, SubscriptionPlan> = new Map([
    ['basic', {
      id: 'basic',
      name: 'Basic Plan',
      amount: 2900, // $29.00
      currency: 'usd',
      interval: 'month',
      features: ['10 appointments/month', 'Basic support', 'Email notifications']
    }],
    ['premium', {
      id: 'premium',
      name: 'Premium Plan',
      amount: 9900, // $99.00
      currency: 'usd',
      interval: 'month',
      features: ['Unlimited appointments', 'Priority support', 'SMS notifications', 'Video consultations']
    }],
    ['enterprise', {
      id: 'enterprise',
      name: 'Enterprise Plan',
      amount: 29900, // $299.00
      currency: 'usd',
      interval: 'month',
      features: ['Unlimited everything', '24/7 support', 'Custom integrations', 'Dedicated account manager']
    }]
  ]);

  async createSubscription(data: CreateSubscriptionData): Promise<any> {
    try {
      const plan = this.plans.get(data.planId);
      if (!plan) {
        throw new Error('Invalid plan ID');
      }

      // Create subscription via Stripe
      const subscription = await stripeService.createSubscription({
        customerId: data.userId,
        priceId: plan.id,
        paymentMethodId: data.paymentMethodId
      });

      // Log initial transaction
      await db.insert(transactions).values({
        userId: data.userId,
        amount: plan.amount,
        currency: plan.currency,
        status: 'succeeded',
        paymentMethod: 'card',
        description: `Subscription: ${plan.name}`,
        metadata: {
          subscriptionId: subscription.id,
          planId: plan.id,
          interval: plan.interval
        },
        tenantId: data.tenantId
      });

      logger.info(`Subscription created for user ${data.userId}: ${plan.name}`);
      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string, userId: string): Promise<void> {
    try {
      await stripeService.cancelSubscription(subscriptionId);

      logger.info(`Subscription ${subscriptionId} cancelled for user ${userId}`);
    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  async updateSubscription(subscriptionId: string, newPlanId: string): Promise<any> {
    try {
      const plan = this.plans.get(newPlanId);
      if (!plan) {
        throw new Error('Invalid plan ID');
      }

      const subscription = await stripeService.updateSubscription(subscriptionId, {
        priceId: plan.id
      });

      logger.info(`Subscription ${subscriptionId} updated to ${plan.name}`);
      return subscription;
    } catch (error) {
      logger.error('Failed to update subscription:', error);
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      return await stripeService.getSubscription(subscriptionId);
    } catch (error) {
      logger.error('Failed to get subscription:', error);
      throw error;
    }
  }

  async getUserSubscriptions(userId: string): Promise<any[]> {
    try {
      return await stripeService.getUserSubscriptions(userId);
    } catch (error) {
      logger.error('Failed to get user subscriptions:', error);
      return [];
    }
  }

  getPlans(): SubscriptionPlan[] {
    return Array.from(this.plans.values());
  }

  getPlan(planId: string): SubscriptionPlan | undefined {
    return this.plans.get(planId);
  }

  async handleSubscriptionRenewal(subscriptionId: string, userId: string): Promise<void> {
    try {
      const subscription = await this.getSubscription(subscriptionId);
      const plan = this.getPlan(subscription.planId);

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Log renewal transaction
      await db.insert(transactions).values({
        userId,
        amount: plan.amount,
        currency: plan.currency,
        status: 'succeeded',
        paymentMethod: 'card',
        description: `Subscription renewal: ${plan.name}`,
        metadata: {
          subscriptionId,
          planId: plan.id,
          type: 'renewal'
        },
        tenantId: subscription.tenantId
      });

      logger.info(`Subscription ${subscriptionId} renewed for user ${userId}`);
    } catch (error) {
      logger.error('Failed to handle subscription renewal:', error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
