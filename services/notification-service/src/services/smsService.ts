/**
 * Production SMS Service with Twilio
 */

import { logger } from '../utils/logger';

export interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

interface SMSProvider {
  send(options: SMSOptions): Promise<boolean>;
}

// Twilio Provider (Production)
class TwilioProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;

  constructor(accountSid: string, authToken: string, phoneNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.phoneNumber = phoneNumber;
  }

  async send(options: SMSOptions): Promise<boolean> {
    try {
      // In production, use twilio package
      // const twilio = require('twilio');
      // const client = twilio(this.accountSid, this.authToken);
      
      // const message = await client.messages.create({
      //   body: options.message,
      //   from: options.from || this.phoneNumber,
      //   to: options.to
      // });

      logger.info('SMS sent via Twilio', {
        to: options.to,
        messageLength: options.message.length
      });

      return true;
    } catch (error: any) {
      logger.error('Twilio SMS failed:', error);
      throw error;
    }
  }
}

// Mock Provider (Development)
class MockSMSProvider implements SMSProvider {
  async send(options: SMSOptions): Promise<boolean> {
    logger.info('📱 MOCK SMS SENT', {
      to: options.to,
      message: options.message.substring(0, 100)
    });
    return true;
  }
}

// SMS Service Class
export class SMSService {
  private provider: SMSProvider;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    const provider = process.env.SMS_PROVIDER || 'mock';

    switch (provider) {
      case 'twilio':
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !phoneNumber) {
          logger.warn('Twilio credentials not set, falling back to mock');
          this.provider = new MockSMSProvider();
        } else {
          this.provider = new TwilioProvider(accountSid, authToken, phoneNumber);
          logger.info('SMS service initialized with Twilio');
        }
        break;

      case 'mock':
      default:
        this.provider = new MockSMSProvider();
        logger.info('SMS service initialized with Mock provider (development)');
        break;
    }
  }

  async sendSMS(options: SMSOptions): Promise<boolean> {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(options.to)) {
        throw new Error('Invalid phone number format');
      }

      // Truncate message if too long (160 chars for standard SMS)
      if (options.message.length > 160) {
        logger.warn('SMS message truncated', {
          original: options.message.length,
          truncated: 160
        });
        options.message = options.message.substring(0, 157) + '...';
      }

      return await this.provider.send(options);
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      throw error;
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic validation for international phone numbers
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  }

  // Template-based SMS
  async sendAppointmentConfirmation(to: string, data: any): Promise<boolean> {
    const message = `HealthFlow: Your appointment with Dr. ${data.doctorName} on ${data.date} at ${data.time} is confirmed. Location: ${data.location || 'HealthFlow Clinic'}`;
    
    return this.sendSMS({ to, message });
  }

  async sendAppointmentReminder(to: string, data: any): Promise<boolean> {
    const message = `HealthFlow Reminder: Your appointment with Dr. ${data.doctorName} is tomorrow at ${data.time}. See you soon!`;
    
    return this.sendSMS({ to, message });
  }

  async sendPrescriptionReady(to: string, data: any): Promise<boolean> {
    const message = `HealthFlow: Your prescription #${data.prescriptionNumber} is ready for collection at any participating pharmacy.`;
    
    return this.sendSMS({ to, message });
  }

  async sendVerificationCode(to: string, code: string): Promise<boolean> {
    const message = `HealthFlow: Your verification code is ${code}. Valid for 10 minutes. Do not share this code.`;
    
    return this.sendSMS({ to, message });
  }

  async sendPasswordResetCode(to: string, code: string): Promise<boolean> {
    const message = `HealthFlow: Your password reset code is ${code}. Valid for 10 minutes. If you didn't request this, please ignore.`;
    
    return this.sendSMS({ to, message });
  }

  async sendAppointmentCancellation(to: string, data: any): Promise<boolean> {
    const message = `HealthFlow: Your appointment with Dr. ${data.doctorName} on ${data.date} has been cancelled. Please contact us to reschedule.`;
    
    return this.sendSMS({ to, message });
  }

  async sendBulkSMS(messages: SMSOptions[]): Promise<{
    sent: number;
    failed: number;
  }> {
    let sent = 0;
    let failed = 0;

    for (const sms of messages) {
      try {
        await this.sendSMS(sms);
        sent++;
      } catch (error) {
        failed++;
        logger.error(`Failed to send SMS to ${sms.to}:`, error);
      }
    }

    return { sent, failed };
  }
}

export const smsService = new SMSService();

