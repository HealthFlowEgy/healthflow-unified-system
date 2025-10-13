/**
 * HealthPay Payment Gateway Integration
 * Egypt's healthcare payment gateway
 * 
 * API Documentation: https://documenter.getpostman.com/view/22876315/2sA3QmEv3i
 * Portal: https://portal.beta.healthpay.tech
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

interface HealthPayConfig {
  apiUrl: string;
  apiHeader: string;
  merchantEmail: string;
  merchantPassword: string;
}

interface AuthMerchantResponse {
  token: string;
  merchant: {
    id: string;
    email: string;
    name: string;
    status: string;
  };
}

interface PaymentRequestData {
  amount: number;
  currency: string;
  orderId: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  description?: string;
  items?: Array<{
    name: string;
    amount: number;
    quantity: number;
  }>;
}

interface PaymentRequestResponse {
  requestId: string;
  status: string;
  paymentUrl?: string;
  qrCode?: string;
}

interface PaymentStatus {
  requestId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  paidAt?: Date;
  transactionId?: string;
}

class HealthPayService {
  private client: AxiosInstance;
  private config: HealthPayConfig;
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      apiUrl: process.env.HEALTHPAY_API_URL || 'https://api.beta.healthpay.tech/graphql',
      apiHeader: process.env.HEALTHPAY_API_HEADER || 'H_0003rjeb7ke0dejn',
      merchantEmail: process.env.HEALTHPAY_MERCHANT_EMAIL || 'beta.account@healthpay.tech',
      merchantPassword: process.env.HEALTHPAY_MERCHANT_PASSWORD || 'BetaAcc@HealthPay2024'
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'api-header': this.config.apiHeader
      },
      timeout: 30000
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(async (config) => {
      const token = await this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Authenticate merchant and get access token
   */
  private async authenticateMerchant(): Promise<string> {
    try {
      const mutation = `
        mutation authMerchant($email: String!, $password: String!) {
          authMerchant(email: $email, password: $password) {
            token
            merchant {
              id
              email
              name
              status
            }
          }
        }
      `;

      const response = await this.client.post('', {
        query: mutation,
        variables: {
          email: this.config.merchantEmail,
          password: this.config.merchantPassword
        }
      });

      if (response.data.errors) {
        throw new Error(`HealthPay auth failed: ${response.data.errors[0].message}`);
      }

      const { token, merchant } = response.data.data.authMerchant;
      
      logger.info(`HealthPay merchant authenticated: ${merchant.name}`);
      
      // Store token with 1 hour expiry
      this.authToken = token;
      this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      return token;
    } catch (error) {
      logger.error('HealthPay authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get valid auth token (refresh if expired)
   */
  private async getAuthToken(): Promise<string> {
    if (this.authToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.authToken;
    }

    return await this.authenticateMerchant();
  }

  /**
   * Create payment request
   */
  async createPaymentRequest(data: PaymentRequestData): Promise<PaymentRequestResponse> {
    try {
      const mutation = `
        mutation sendPaymentRequest(
          $amount: Float!
          $currency: String!
          $orderId: String!
          $customerEmail: String!
          $customerPhone: String!
          $customerName: String!
          $description: String
        ) {
          sendPaymentRequest(
            amount: $amount
            currency: $currency
            orderId: $orderId
            customerEmail: $customerEmail
            customerPhone: $customerPhone
            customerName: $customerName
            description: $description
          ) {
            requestId
            status
            paymentUrl
            qrCode
          }
        }
      `;

      const response = await this.client.post('', {
        query: mutation,
        variables: {
          amount: data.amount,
          currency: data.currency || 'EGP',
          orderId: data.orderId,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          customerName: data.customerName,
          description: data.description || `Payment for order ${data.orderId}`
        }
      });

      if (response.data.errors) {
        throw new Error(`Payment request failed: ${response.data.errors[0].message}`);
      }

      const result = response.data.data.sendPaymentRequest;
      
      logger.info(`HealthPay payment request created: ${result.requestId}`);

      return result;
    } catch (error) {
      logger.error('Failed to create HealthPay payment request:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(requestId: string): Promise<PaymentStatus> {
    try {
      const query = `
        query userPaymentRequests($requestId: String!) {
          userPaymentRequests(requestId: $requestId) {
            requestId
            status
            amount
            currency
            paidAt
            transactionId
          }
        }
      `;

      const response = await this.client.post('', {
        query,
        variables: { requestId }
      });

      if (response.data.errors) {
        throw new Error(`Failed to get payment status: ${response.data.errors[0].message}`);
      }

      return response.data.data.userPaymentRequests;
    } catch (error) {
      logger.error('Failed to get HealthPay payment status:', error);
      throw error;
    }
  }

  /**
   * Process payment callback/webhook
   */
  async processWebhook(payload: any): Promise<void> {
    try {
      logger.info('Processing HealthPay webhook:', payload);

      const { requestId, status, amount, transactionId } = payload;

      // Update transaction status in database
      // This will be handled by the webhook controller

      logger.info(`HealthPay webhook processed: ${requestId} - ${status}`);
    } catch (error) {
      logger.error('Failed to process HealthPay webhook:', error);
      throw error;
    }
  }

  /**
   * Create medical card for patient
   */
  async createMedCard(data: {
    mobile: string;
    fullName: string;
    nationalId: string;
    birthDate: string;
    gender: string;
    relationId: number;
  }): Promise<any> {
    try {
      const mutation = `
        mutation createMedCard(
          $mobile: String!
          $fullName: String!
          $nationalId: String!
          $birthDate: String!
          $gender: String!
          $relationId: Float!
        ) {
          createMedCard(
            mobile: $mobile
            fullName: $fullName
            nationalId: $nationalId
            birthDate: $birthDate
            gender: $gender
            relationId: $relationId
          ) {
            id
            cardNumber
            status
            balance
          }
        }
      `;

      const response = await this.client.post('', {
        query: mutation,
        variables: data
      });

      if (response.data.errors) {
        throw new Error(`Failed to create med card: ${response.data.errors[0].message}`);
      }

      const medCard = response.data.data.createMedCard;
      
      logger.info(`HealthPay med card created: ${medCard.cardNumber}`);

      return medCard;
    } catch (error) {
      logger.error('Failed to create HealthPay med card:', error);
      throw error;
    }
  }

  /**
   * Get active medical cards for user
   */
  async getActiveMedCards(userId: string): Promise<any[]> {
    try {
      const query = `
        query getActiveMedCards($userId: String!) {
          getActiveMedCards(userId: $userId) {
            id
            cardNumber
            fullName
            status
            balance
            expiryDate
          }
        }
      `;

      const response = await this.client.post('', {
        query,
        variables: { userId }
      });

      if (response.data.errors) {
        throw new Error(`Failed to get med cards: ${response.data.errors[0].message}`);
      }

      return response.data.data.getActiveMedCards || [];
    } catch (error) {
      logger.error('Failed to get HealthPay med cards:', error);
      return [];
    }
  }

  /**
   * Pay to user (transfer funds)
   */
  async payToUser(data: {
    recipientId: string;
    amount: number;
    currency: string;
    description?: string;
  }): Promise<any> {
    try {
      const mutation = `
        mutation payToUser(
          $recipientId: String!
          $amount: Float!
          $currency: String!
          $description: String
        ) {
          payToUser(
            recipientId: $recipientId
            amount: $amount
            currency: $currency
            description: $description
          ) {
            transactionId
            status
            amount
            currency
          }
        }
      `;

      const response = await this.client.post('', {
        query: mutation,
        variables: data
      });

      if (response.data.errors) {
        throw new Error(`Payment to user failed: ${response.data.errors[0].message}`);
      }

      const result = response.data.data.payToUser;
      
      logger.info(`HealthPay payment to user completed: ${result.transactionId}`);

      return result;
    } catch (error) {
      logger.error('Failed to pay to user via HealthPay:', error);
      throw error;
    }
  }

  /**
   * Topup user wallet
   */
  async topupWallet(data: {
    userId: string;
    amount: number;
    currency: string;
  }): Promise<any> {
    try {
      const mutation = `
        mutation topupWalletUser(
          $userId: String!
          $amount: Float!
          $currency: String!
        ) {
          topupWalletUser(
            userId: $userId
            amount: $amount
            currency: $currency
          ) {
            walletId
            balance
            currency
          }
        }
      `;

      const response = await this.client.post('', {
        query: mutation,
        variables: data
      });

      if (response.data.errors) {
        throw new Error(`Wallet topup failed: ${response.data.errors[0].message}`);
      }

      return response.data.data.topupWalletUser;
    } catch (error) {
      logger.error('Failed to topup wallet via HealthPay:', error);
      throw error;
    }
  }

  /**
   * Deduct from user wallet
   */
  async deductFromWallet(data: {
    userId: string;
    amount: number;
    currency: string;
    description?: string;
  }): Promise<any> {
    try {
      const mutation = `
        mutation deductFromUser(
          $userId: String!
          $amount: Float!
          $currency: String!
          $description: String
        ) {
          deductFromUser(
            userId: $userId
            amount: $amount
            currency: $currency
            description: $description
          ) {
            walletId
            balance
            currency
            transactionId
          }
        }
      `;

      const response = await this.client.post('', {
        query: mutation,
        variables: data
      });

      if (response.data.errors) {
        throw new Error(`Wallet deduction failed: ${response.data.errors[0].message}`);
      }

      return response.data.data.deductFromUser;
    } catch (error) {
      logger.error('Failed to deduct from wallet via HealthPay:', error);
      throw error;
    }
  }

  /**
   * Get user wallet balance
   */
  async getUserWallet(userId: string): Promise<any> {
    try {
      const query = `
        query userWallet($userId: String!) {
          userWallet(userId: $userId) {
            id
            balance
            currency
            status
          }
        }
      `;

      const response = await this.client.post('', {
        query,
        variables: { userId }
      });

      if (response.data.errors) {
        throw new Error(`Failed to get wallet: ${response.data.errors[0].message}`);
      }

      return response.data.data.userWallet;
    } catch (error) {
      logger.error('Failed to get user wallet from HealthPay:', error);
      throw error;
    }
  }
}

export const healthpayService = new HealthPayService();
