// Sprint 2 - PDF Generation Utility
// ------------------------------------------------------------------------------

import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export async function generatePDF(options: {
  template: string;
  data: any;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    // Generate receipt based on template
    if (options.template === 'dispensing-receipt') {
      generateDispensingReceipt(doc, options.data);
    }
    
    doc.end();
  });
}

function generateDispensingReceipt(doc: PDFKit.PDFDocument, data: any) {
  const { record } = data;
  
  // Header
  doc.fontSize(20).text('PHARMACY RECEIPT', { align: 'center' });
  doc.moveDown();
  
  // Pharmacy Info
  doc.fontSize(12);
  doc.text(`Pharmacy: ${record.pharmacy.pharmacyName}`);
  doc.text(`Address: ${record.pharmacy.address}`);
  doc.text(`Phone: ${record.pharmacy.phone}`);
  doc.text(`License: ${record.pharmacy.licenseNumber}`);
  doc.moveDown();
  
  // Receipt Info
  doc.text(`Receipt #: ${record.id}`);
  doc.text(`Date: ${new Date(record.dispensedAt).toLocaleString()}`);
  doc.text(`Dispensed by: ${record.dispensedByUser.fullName}`);
  doc.moveDown();
  
  // Patient Info
  doc.text(`Patient: ${record.prescription.patientName}`);
  doc.text(`Prescription #: ${record.prescription.prescriptionNumber}`);
  doc.text(`Doctor: ${record.prescription.doctor.fullName}`);
  doc.moveDown();
  
  // Medications
  doc.fontSize(14).text('Medications:', { underline: true });
  doc.fontSize(10);
  doc.moveDown(0.5);
  
  const medications = record.medicationsDispensed as any[];
  let y = doc.y;
  
  medications.forEach((med, index) => {
    doc.text(`${index + 1}. ${med.name}`, 50, y);
    doc.text(`${med.quantity} units`, 300, y);
    doc.text(`EGP ${(med.quantity * Number(med.price)).toFixed(2)}`, 450, y, { align: 'right' });
    y += 20;
  });
  
  doc.moveDown(2);
  
  // Total
  doc.fontSize(14);
  doc.text(`Total Amount: EGP ${Number(record.totalAmount).toFixed(2)}`, { align: 'right' });
  doc.text(`Payment Method: ${record.paymentMethod}`, { align: 'right' });
  
  // Footer
  doc.moveDown(3);
  doc.fontSize(10);
  doc.text('Thank you for your business!', { align: 'center' });
  doc.text('Keep this receipt for your records', { align: 'center' });
}

// ------------------------------------------------------------------------------