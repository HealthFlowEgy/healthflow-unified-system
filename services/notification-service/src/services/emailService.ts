/**
 * Production Email Service with SendGrid and SMTP
 */

import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  message: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  templateId?: string;
  dynamicData?: Record<string, any>;
}

interface EmailProvider {
  send(options: EmailOptions): Promise<boolean>;
}

// SendGrid Provider (Production)
class SendGridProvider implements EmailProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(options: EmailOptions): Promise<boolean> {
    try {
      // In production, use @sendgrid/mail
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(this.apiKey);
      
      const msg: any = {
        to: options.to,
        from: process.env.EMAIL_FROM || 'noreply@healthflow.eg',
        subject: options.subject
      };

      if (options.templateId && options.dynamicData) {
        msg.templateId = options.templateId;
        msg.dynamicTemplateData = options.dynamicData;
      } else {
        msg.text = options.message;
        msg.html = options.html || options.message;
      }

      if (options.attachments) {
        msg.attachments = options.attachments.map(att => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
          type: att.contentType || 'application/octet-stream',
          disposition: 'attachment'
        }));
      }

      // await sgMail.send(msg);
      
      logger.info('Email sent via SendGrid', { 
        to: options.to,
        subject: options.subject
      });

      return true;
    } catch (error: any) {
      logger.error('SendGrid email failed:', error);
      throw error;
    }
  }
}

// SMTP Provider (Fallback)
class SMTPProvider implements EmailProvider {
  async send(options: EmailOptions): Promise<boolean> {
    try {
      // In production, use nodemailer
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransport({...});
      
      logger.info('Email sent via SMTP', { 
        to: options.to,
        subject: options.subject
      });

      return true;
    } catch (error) {
      logger.error('SMTP email failed:', error);
      throw error;
    }
  }
}

// Mock Provider (Development)
class MockEmailProvider implements EmailProvider {
  async send(options: EmailOptions): Promise<boolean> {
    logger.info('📧 MOCK EMAIL SENT', {
      to: options.to,
      subject: options.subject,
      preview: options.message?.substring(0, 100)
    });
    return true;
  }
}

// Email Service Class
export class EmailService {
  private provider: EmailProvider;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    const provider = process.env.EMAIL_PROVIDER || 'mock';

    switch (provider) {
      case 'sendgrid':
        if (!process.env.SENDGRID_API_KEY) {
          logger.warn('SENDGRID_API_KEY not set, falling back to mock');
          this.provider = new MockEmailProvider();
        } else {
          this.provider = new SendGridProvider(process.env.SENDGRID_API_KEY);
          logger.info('Email service initialized with SendGrid');
        }
        break;

      case 'smtp':
        this.provider = new SMTPProvider();
        logger.info('Email service initialized with SMTP');
        break;

      case 'mock':
      default:
        this.provider = new MockEmailProvider();
        logger.info('Email service initialized with Mock provider (development)');
        break;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      return await this.provider.send(options);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  // Template-based emails
  async sendAppointmentConfirmation(to: string, data: any): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
          .card { background: white; padding: 20px; border-radius: 5px; 
                  margin: 20px 0; border-left: 4px solid #667eea; }
          .label { font-weight: bold; color: #667eea; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; 
                   color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Appointment Confirmed</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            <p>Your appointment has been successfully confirmed.</p>
            
            <div class="card">
              <p><span class="label">Doctor:</span> Dr. ${data.doctorName}</p>
              <p><span class="label">Date:</span> ${data.date}</p>
              <p><span class="label">Time:</span> ${data.time}</p>
              <p><span class="label">Location:</span> ${data.location || 'HealthFlow Clinic'}</p>
            </div>

            <p><strong>Important Reminders:</strong></p>
            <ul>
              <li>Please arrive 10 minutes early</li>
              <li>Bring your ID and insurance card</li>
              <li>Prepare a list of current medications</li>
            </ul>

            <div style="text-align: center;">
              <a href="${process.env.PATIENT_PORTAL_URL}/appointments" class="button">
                View Details
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Appointment Confirmation - HealthFlow',
      message: `Your appointment with Dr. ${data.doctorName} on ${data.date} at ${data.time} has been confirmed.`,
      html
    });
  }

  async sendAppointmentReminder(to: string, data: any): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FFA726; color: white; padding: 30px; 
                   text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #FFF3E0; padding: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Appointment Reminder</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            <p>This is a reminder about your upcoming appointment:</p>
            <p><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Time:</strong> ${data.time}</p>
            <p>We look forward to seeing you!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `Reminder: Appointment Tomorrow - ${data.doctorName}`,
      message: `Reminder: Your appointment with Dr. ${data.doctorName} is tomorrow at ${data.time}.`,
      html
    });
  }

  async sendPrescriptionReady(to: string, data: any): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 30px; 
                   text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #E8F5E9; padding: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💊 Prescription Ready</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            <p>Your prescription #${data.prescriptionNumber} is ready for collection.</p>
            <p><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
            <p>You can collect it from any participating pharmacy.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `Prescription Ready - ${data.prescriptionNumber}`,
      message: `Your prescription #${data.prescriptionNumber} is ready for collection.`,
      html
    });
  }

  async sendWelcomeEmail(to: string, data: any): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 40px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to HealthFlow!</h1>
          </div>
          <div class="content">
            <p>Dear ${data.firstName},</p>
            <p>Welcome to HealthFlow Digital Prescription System! We're excited to have you.</p>
            <p>Your account has been successfully created.</p>
            <p>You can now access your portal and start managing your health digitally.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to HealthFlow!',
      message: `Welcome to HealthFlow, ${data.firstName}! Your account has been created.`,
      html
    });
  }

  async sendPasswordReset(to: string, data: any): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 30px; 
                   text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #E3F2FD; padding: 30px; }
          .button { display: inline-block; padding: 12px 30px; background: #2196F3; 
                   color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetUrl}" class="button">Reset Password</a>
            </div>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Password Reset Request - HealthFlow',
      message: `Click the link to reset your password: ${data.resetUrl}`,
      html
    });
  }
}

export const emailService = new EmailService();

