/**
 * Invoice Generation Service
 * Generate and manage invoices
 */

import { db } from '../config/database';
import { invoices, transactions } from '../models/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface GenerateInvoiceData {
  userId: string;
  transactionId: string;
  items: InvoiceItem[];
  tenantId: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

class InvoiceService {
  async generateInvoice(data: GenerateInvoiceData): Promise<any> {
    try {
      // Get transaction details
      const [transaction] = await db.select()
        .from(transactions)
        .where(eq(transactions.id, data.transactionId));

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Calculate totals
      const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
      const tax = Math.round(subtotal * 0.1); // 10% tax
      const total = subtotal + tax;

      // Create invoice
      const [invoice] = await db.insert(invoices).values({
        userId: data.userId,
        invoiceNumber,
        transactionId: data.transactionId,
        amount: total,
        currency: transaction.currency,
        status: 'paid',
        items: data.items,
        subtotal,
        tax,
        total,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        tenantId: data.tenantId
      }).returning();

      logger.info(`Invoice generated: ${invoiceNumber}`);
      return invoice;
    } catch (error) {
      logger.error('Failed to generate invoice:', error);
      throw error;
    }
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get count of invoices this month
    const count = await db.select()
      .from(invoices)
      .where(
        and(
          gte(invoices.createdAt, new Date(year, new Date().getMonth(), 1)),
          lt(invoices.createdAt, new Date(year, new Date().getMonth() + 1, 1))
        )
      );

    const sequence = String(count.length + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  async getInvoice(invoiceId: string): Promise<any> {
    try {
      const [invoice] = await db.select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId));

      return invoice;
    } catch (error) {
      logger.error('Failed to get invoice:', error);
      return null;
    }
  }

  async getUserInvoices(userId: string): Promise<any[]> {
    try {
      return await db.select()
        .from(invoices)
        .where(eq(invoices.userId, userId))
        .orderBy(desc(invoices.createdAt));
    } catch (error) {
      logger.error('Failed to get user invoices:', error);
      return [];
    }
  }

  async generatePDF(invoiceId: string): Promise<Buffer> {
    try {
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Mock PDF generation
      // In production, use PDFKit or similar library
      const pdfContent = `
        INVOICE
        
        Invoice Number: ${invoice.invoiceNumber}
        Date: ${invoice.createdAt.toLocaleDateString()}
        Due Date: ${invoice.dueDate.toLocaleDateString()}
        
        Items:
        ${invoice.items.map((item: InvoiceItem) => 
          `${item.description} - ${item.quantity} x $${item.unitPrice} = $${item.total}`
        ).join('\n')}
        
        Subtotal: $${invoice.subtotal}
        Tax: $${invoice.tax}
        Total: $${invoice.total}
        
        Status: ${invoice.status.toUpperCase()}
      `;

      return Buffer.from(pdfContent);
    } catch (error) {
      logger.error('Failed to generate PDF:', error);
      throw error;
    }
  }

  async sendInvoiceEmail(invoiceId: string): Promise<void> {
    try {
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Mock email sending
      // In production, integrate with notification service
      logger.info(`Invoice email sent: ${invoice.invoiceNumber}`);
    } catch (error) {
      logger.error('Failed to send invoice email:', error);
      throw error;
    }
  }
}

export const invoiceService = new InvoiceService();
