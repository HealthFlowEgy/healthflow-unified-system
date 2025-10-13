/**
 * Report Generation Service
 * Generate and export reports in multiple formats
 */

import { db } from '../config/database';
import { scheduledReports, reportExecutions } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

interface ReportData {
  title: string;
  description?: string;
  data: any[];
  columns: ReportColumn[];
  filters?: any;
  generatedBy: string;
  tenantId: string;
}

interface ReportColumn {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts?: boolean;
  includeMetadata?: boolean;
}

class ReportService {
  /**
   * Generate report data
   */
  async generateReport(reportId: string, parameters?: any): Promise<any> {
    const report = await db.query.scheduledReports.findFirst({
      where: eq(scheduledReports.id, reportId)
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Execute report query based on type
    let data: any[] = [];
    
    switch (report.reportType) {
      case 'prescription_summary':
        data = await this.getPrescriptionSummary(parameters);
        break;
      case 'user_activity':
        data = await this.getUserActivityReport(parameters);
        break;
      case 'appointment_analytics':
        data = await this.getAppointmentAnalytics(parameters);
        break;
      case 'financial_summary':
        data = await this.getFinancialSummary(parameters);
        break;
      default:
        throw new Error(`Unknown report type: ${report.reportType}`);
    }

    // Log execution
    await this.logExecution(reportId, data.length, 'success');

    return {
      report,
      data,
      executedAt: new Date(),
      rowCount: data.length
    };
  }

  /**
   * Export report to specified format
   */
  async exportReport(reportData: ReportData, options: ExportOptions): Promise<Buffer> {
    switch (options.format) {
      case 'excel':
        return await this.exportToExcel(reportData);
      case 'pdf':
        return await this.exportToPDF(reportData);
      case 'csv':
        return await this.exportToCSV(reportData);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export to Excel
   */
  private async exportToExcel(reportData: ReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportData.title);

    // Add headers
    const headers = reportData.columns.map(col => col.label);
    worksheet.addRow(headers);

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    reportData.data.forEach(row => {
      const values = reportData.columns.map(col => {
        const value = row[col.key];
        if (col.type === 'date' && value) {
          return new Date(value);
        }
        return value;
      });
      worksheet.addRow(values);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Add metadata sheet if requested
    if (reportData.description) {
      const metaSheet = workbook.addWorksheet('Metadata');
      metaSheet.addRow(['Report Title', reportData.title]);
      metaSheet.addRow(['Description', reportData.description]);
      metaSheet.addRow(['Generated At', new Date()]);
      metaSheet.addRow(['Row Count', reportData.data.length]);
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  /**
   * Export to PDF
   */
  private async exportToPDF(reportData: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text(reportData.title, { align: 'center' });
      doc.moveDown();

      if (reportData.description) {
        doc.fontSize(12).text(reportData.description);
        doc.moveDown();
      }

      // Metadata
      doc.fontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.text(`Records: ${reportData.data.length}`);
      doc.moveDown();

      // Table (simplified - real implementation would need better formatting)
      doc.fontSize(9);
      
      // Headers
      const headerText = reportData.columns.map(col => col.label).join(' | ');
      doc.font('Helvetica-Bold').text(headerText);
      doc.font('Helvetica');

      // Data rows (limit to prevent overflow)
      const maxRows = Math.min(reportData.data.length, 50);
      for (let i = 0; i < maxRows; i++) {
        const row = reportData.data[i];
        const rowText = reportData.columns.map(col => {
          const value = row[col.key];
          return value !== null && value !== undefined ? String(value) : '';
        }).join(' | ');
        doc.text(rowText);
      }

      if (reportData.data.length > maxRows) {
        doc.text(`... and ${reportData.data.length - maxRows} more rows`);
      }

      doc.end();
    });
  }

  /**
   * Export to CSV
   */
  private async exportToCSV(reportData: ReportData): Promise<Buffer> {
    const lines: string[] = [];

    // Headers
    const headers = reportData.columns.map(col => this.escapeCSV(col.label));
    lines.push(headers.join(','));

    // Data rows
    reportData.data.forEach(row => {
      const values = reportData.columns.map(col => {
        const value = row[col.key];
        return this.escapeCSV(value !== null && value !== undefined ? String(value) : '');
      });
      lines.push(values.join(','));
    });

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  /**
   * Escape CSV value
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Schedule report
   */
  async scheduleReport(data: any): Promise<any> {
    const report = await db.insert(scheduledReports).values({
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    }).returning();

    return report[0];
  }

  /**
   * Log report execution
   */
  private async logExecution(reportId: string, rowCount: number, status: string, error?: string): Promise<void> {
    await db.insert(reportExecutions).values({
      id: uuidv4(),
      reportId,
      executedAt: new Date(),
      status,
      rowCount,
      error: error || null
    });
  }

  /**
   * Get prescription summary report data
   */
  private async getPrescriptionSummary(parameters: any): Promise<any[]> {
    // This would query the prescription service
    // For now, return mock data structure
    return [];
  }

  /**
   * Get user activity report data
   */
  private async getUserActivityReport(parameters: any): Promise<any[]> {
    // This would query the user management service
    return [];
  }

  /**
   * Get appointment analytics report data
   */
  private async getAppointmentAnalytics(parameters: any): Promise<any[]> {
    // This would query the appointment service
    return [];
  }

  /**
   * Get financial summary report data
   */
  private async getFinancialSummary(parameters: any): Promise<any[]> {
    // This would aggregate financial data
    return [];
  }
}

export const reportService = new ReportService();

