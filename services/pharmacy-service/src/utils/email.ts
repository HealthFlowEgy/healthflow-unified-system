// Sprint 2 - Email Utility
// ------------------------------------------------------------------------------

import nodemailer from 'nodemailer';
import { logger } from './logger';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  data: any;
  attachments?: any[];
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const html = await renderTemplate(options.template, options.data);
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@healthflow.ai',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html,
      attachments: options.attachments
    });
    
    logger.info('Email sent successfully', {
      to: options.to,
      subject: options.subject,
      template: options.template
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
}

async function renderTemplate(template: string, data: any): Promise<string> {
  // Simple template rendering - in production, use a proper template engine
  const templates: Record<string, Function> = {
    'low-stock-alert': (data) => `
      <h2>Low Stock Alert</h2>
      <p>The following item is running low on stock:</p>
      <p>Item ID: ${data.itemId}</p>
      <p>Current Quantity: ${data.quantity}</p>
      <p>Minimum Level: ${data.minStockLevel}</p>
      <p>Please reorder soon.</p>
    `,
    'receipt-email': (data) => `
      <h2>Receipt for Prescription ${data.record.prescription.prescriptionNumber}</h2>
      <p>Dear ${data.patientName},</p>
      <p>Thank you for visiting our pharmacy. Your receipt is attached to this email.</p>
      <p>Total Amount: EGP ${data.record.totalAmount}</p>
      <p>If you have any questions, please contact us.</p>
    `,
    'pharmacy-verified': (data) => `
      <h2>Pharmacy Verification Complete</h2>
      <p>Dear ${data.ownerName},</p>
      <p>Congratulations! Your pharmacy "${data.pharmacyName}" has been verified by the EDA.</p>
      <p>You can now start using the pharmacy portal to dispense prescriptions.</p>
      <p><a href="${data.dashboardLink}">Go to Dashboard</a></p>
    `
  };
  
  const renderer = templates[template];
  return renderer ? renderer(data) : `<p>Template ${template} not found</p>`;
}