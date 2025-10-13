// Sprint 2 - Dispensing Service Business Logic
// ------------------------------------------------------------------------------

import { db } from '../database/connection';
import { 
  prescriptions,
  dispensingRecords,
  pharmacyInventory,
  medicines,
  users,
  pharmacies,
  notifications
} from '../database/schema';
import { eq, and, or, sql, like, gte, lte, desc } from 'drizzle-orm';
import { AppError } from '../utils/errors';
import { sendEmail } from '../utils/email';
import { generatePDF } from '../utils/pdf';
import { logger } from '../utils/logger';

export class DispensingService {
  async getPendingPrescriptions(pharmacyId: string, filters: any) {
    const { page = 1, limit = 20, priority } = filters;
    const offset = (page - 1) * limit;
    
    // Get prescriptions that are validated but not dispensed
    const conditions = [
      eq(prescriptions.status, 'validated'),
      sql`${prescriptions.pharmacyId} IS NULL OR ${prescriptions.pharmacyId} = ${pharmacyId}`
    ];
    
    const [items, totalResult] = await Promise.all([
      db.query.prescriptions.findMany({
        where: and(...conditions),
        limit,
        offset,
        orderBy: (prescriptions, { desc }) => [desc(prescriptions.createdAt)],
        with: {
          doctor: {
            columns: {
              id: true,
              fullName: true,
              licenseNumber: true
            }
          }
        }
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(prescriptions)
        .where(and(...conditions))
    ]);
    
    const total = Number(totalResult[0]?.count || 0);
    
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  async searchPrescriptions(pharmacyId: string, searchParams: any) {
    const {
      prescriptionNumber,
      patientName,
      patientPhone,
      doctorName,
      dateFrom,
      dateTo
    } = searchParams;
    
    const conditions = [];
    
    if (prescriptionNumber) {
      conditions.push(like(prescriptions.prescriptionNumber, `%${prescriptionNumber}%`));
    }
    
    if (patientName) {
      conditions.push(like(prescriptions.patientName, `%${patientName}%`));
    }
    
    if (patientPhone) {
      conditions.push(like(prescriptions.patientPhone, `%${patientPhone}%`));
    }
    
    if (doctorName) {
      conditions.push(like(prescriptions.doctorName, `%${doctorName}%`));
    }
    
    if (dateFrom) {
      conditions.push(gte(prescriptions.createdAt, new Date(dateFrom)));
    }
    
    if (dateTo) {
      conditions.push(lte(prescriptions.createdAt, new Date(dateTo)));
    }
    
    const results = await db.query.prescriptions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: 50,
      orderBy: (prescriptions, { desc }) => [desc(prescriptions.createdAt)]
    });
    
    return results;
  }
  
  async getPrescription(pharmacyId: string, prescriptionId: string) {
    const prescription = await db.query.prescriptions.findFirst({
      where: eq(prescriptions.id, prescriptionId),
      with: {
        doctor: {
          columns: {
            id: true,
            fullName: true,
            licenseNumber: true,
            phoneNumber: true
          }
        }
      }
    });
    
    if (!prescription) {
      return null;
    }
    
    // Get availability of medications in this pharmacy
    const medications = prescription.medications as any[];
    const medicineIds = medications.map(m => m.medicineId).filter(Boolean);
    
    if (medicineIds.length > 0) {
      const availability = await db
        .select({
          medicineId: pharmacyInventory.medicineId,
          availableQuantity: sql<number>`SUM(${pharmacyInventory.quantity})`,
          lowestPrice: sql<number>`MIN(${pharmacyInventory.sellingPrice})`
        })
        .from(pharmacyInventory)
        .where(
          and(
            eq(pharmacyInventory.pharmacyId, pharmacyId),
            sql`${pharmacyInventory.medicineId} IN (${sql.join(medicineIds, sql`, `)})`
          )
        )
        .groupBy(pharmacyInventory.medicineId);
      
      const availabilityMap = Object.fromEntries(
        availability.map(a => [a.medicineId, a])
      );
      
      prescription.medicationAvailability = medications.map(med => ({
        ...med,
        available: availabilityMap[med.medicineId]?.availableQuantity || 0,
        price: availabilityMap[med.medicineId]?.lowestPrice || 0,
        canFulfill: (availabilityMap[med.medicineId]?.availableQuantity || 0) >= (med.quantity || 1)
      }));
    }
    
    return prescription;
  }
  
  async verifyPrescription(
    pharmacyId: string,
    prescriptionId: string,
    verification: any
  ) {
    const prescription = await db.query.prescriptions.findFirst({
      where: eq(prescriptions.id, prescriptionId)
    });
    
    if (!prescription) {
      throw new AppError('PRESCRIPTION_NOT_FOUND', 'Prescription not found', 404);
    }
    
    if (prescription.status !== 'validated') {
      throw new AppError(
        'INVALID_STATUS',
        'Only validated prescriptions can be dispensed',
        400
      );
    }
    
    // Verify based on method
    let verified = false;
    
    switch (verification.method) {
      case 'prescription_number':
        verified = prescription.prescriptionNumber === verification.data;
        break;
      case 'patient_phone':
        verified = prescription.patientPhone === verification.data;
        break;
      case 'patient_id':
        verified = prescription.patientNationalId === verification.data;
        break;
      default:
        throw new AppError('INVALID_METHOD', 'Invalid verification method', 400);
    }
    
    if (!verified) {
      throw new AppError(
        'VERIFICATION_FAILED',
        'Prescription verification failed',
        401
      );
    }
    
    return {
      verified: true,
      prescription
    };
  }
  
  async dispensePrescription(pharmacyId: string, dispensingData: any) {
    const {
      prescriptionId,
      medications,
      paymentMethod,
      counselingNotes,
      dispensedBy
    } = dispensingData;
    
    // Verify prescription
    const prescription = await db.query.prescriptions.findFirst({
      where: eq(prescriptions.id, prescriptionId)
    });
    
    if (!prescription) {
      throw new AppError('PRESCRIPTION_NOT_FOUND', 'Prescription not found', 404);
    }
    
    if (prescription.status === 'dispensed') {
      throw new AppError(
        'ALREADY_DISPENSED',
        'Prescription has already been dispensed',
        400
      );
    }
    
    // Check inventory availability
    const inventoryCheck = await this.checkInventoryAvailability(
      pharmacyId,
      medications
    );
    
    if (!inventoryCheck.available) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        'Insufficient stock for some medications',
        400,
        { unavailableItems: inventoryCheck.unavailableItems }
      );
    }
    
    // Calculate total amount
    const totalAmount = medications.reduce(
      (sum: number, med: any) => sum + (med.quantity * Number(med.price)),
      0
    );
    
    // Start transaction
    const [record] = await db.insert(dispensingRecords).values({
      prescriptionId,
      pharmacyId,
      dispensedBy,
      medicationsDispensed: medications,
      totalAmount: String(totalAmount),
      paymentMethod,
      counselingProvided: !!counselingNotes,
      counselingNotes,
      patientVerified: true,
      verificationMethod: 'prescription_number',
      status: 'completed',
      dispensedAt: new Date()
    }).returning();
    
    // Update inventory quantities
    await this.updateInventoryQuantities(pharmacyId, medications);
    
    // Update prescription status
    await db
      .update(prescriptions)
      .set({
        status: 'dispensed',
        pharmacyId,
        dispensedBy,
        dispensedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(prescriptions.id, prescriptionId));
    
    // Send notifications
    await this.notifyPrescriptionDispensed(prescription, record);
    
    logger.info(`Prescription dispensed successfully`, {
      prescriptionId,
      pharmacyId,
      recordId: record.id,
      totalAmount
    });
    
    return record;
  }
  
  async partialDispensing(pharmacyId: string, dispensingData: any) {
    const {
      prescriptionId,
      medications,
      paymentMethod,
      counselingNotes,
      dispensedBy
    } = dispensingData;
    
    // Get prescription
    const prescription = await db.query.prescriptions.findFirst({
      where: eq(prescriptions.id, prescriptionId)
    });
    
    if (!prescription) {
      throw new AppError('PRESCRIPTION_NOT_FOUND', 'Prescription not found', 404);
    }
    
    // Calculate total
    const totalAmount = medications.reduce(
      (sum: number, med: any) => sum + (med.quantity * Number(med.price)),
      0
    );
    
    // Create partial dispensing record
    const [record] = await db.insert(dispensingRecords).values({
      prescriptionId,
      pharmacyId,
      dispensedBy,
      medicationsDispensed: medications,
      totalAmount: String(totalAmount),
      paymentMethod,
      counselingProvided: !!counselingNotes,
      counselingNotes,
      patientVerified: true,
      status: 'partial',
      dispensedAt: new Date()
    }).returning();
    
    // Update inventory
    await this.updateInventoryQuantities(pharmacyId, medications);
    
    // Update prescription with partial flag
    await db
      .update(prescriptions)
      .set({
        notes: sql`COALESCE(${prescriptions.notes}, '') || '\nPartial dispensing on ' || NOW()::text`,
        updatedAt: new Date()
      })
      .where(eq(prescriptions.id, prescriptionId));
    
    return record;
  }
  
  async getDispensingHistory(pharmacyId: string, filters: any) {
    const {
      page = 1,
      limit = 20,
      dateFrom,
      dateTo,
      status
    } = filters;
    
    const offset = (page - 1) * limit;
    
    const conditions = [eq(dispensingRecords.pharmacyId, pharmacyId)];
    
    if (dateFrom) {
      conditions.push(gte(dispensingRecords.dispensedAt, new Date(dateFrom)));
    }
    
    if (dateTo) {
      conditions.push(lte(dispensingRecords.dispensedAt, new Date(dateTo)));
    }
    
    if (status) {
      conditions.push(eq(dispensingRecords.status, status));
    }
    
    const [items, totalResult] = await Promise.all([
      db.query.dispensingRecords.findMany({
        where: and(...conditions),
        limit,
        offset,
        orderBy: (dispensingRecords, { desc }) => [desc(dispensingRecords.dispensedAt)],
        with: {
          prescription: {
            columns: {
              id: true,
              prescriptionNumber: true,
              patientName: true,
              doctorName: true
            }
          },
          dispensedByUser: {
            columns: {
              id: true,
              fullName: true
            }
          }
        }
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(dispensingRecords)
        .where(and(...conditions))
    ]);
    
    const total = Number(totalResult[0]?.count || 0);
    
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  async getDispensingRecord(pharmacyId: string, recordId: string) {
    const record = await db.query.dispensingRecords.findFirst({
      where: and(
        eq(dispensingRecords.id, recordId),
        eq(dispensingRecords.pharmacyId, pharmacyId)
      ),
      with: {
        prescription: {
          with: {
            doctor: {
              columns: {
                fullName: true,
                licenseNumber: true
              }
            }
          }
        },
        dispensedByUser: {
          columns: {
            fullName: true,
            licenseNumber: true
          }
        },
        pharmacy: {
          columns: {
            pharmacyName: true,
            address: true,
            phone: true,
            licenseNumber: true
          }
        }
      }
    });
    
    return record;
  }
  
  async generateReceipt(pharmacyId: string, recordId: string) {
    const record = await this.getDispensingRecord(pharmacyId, recordId);
    
    if (!record) {
      throw new AppError('RECORD_NOT_FOUND', 'Dispensing record not found', 404);
    }
    
    // Generate PDF receipt
    const pdf = await generatePDF({
      template: 'dispensing-receipt',
      data: {
        record,
        generatedAt: new Date()
      }
    });
    
    return pdf;
  }
  
  async emailReceipt(pharmacyId: string, recordId: string, email: string) {
    const record = await this.getDispensingRecord(pharmacyId, recordId);
    
    if (!record) {
      throw new AppError('RECORD_NOT_FOUND', 'Dispensing record not found', 404);
    }
    
    // Generate PDF
    const pdf = await this.generateReceipt(pharmacyId, recordId);
    
    // Send email
    await sendEmail({
      to: email,
      subject: `Receipt for Prescription ${record.prescription.prescriptionNumber}`,
      template: 'receipt-email',
      data: {
        record,
        patientName: record.prescription.patientName
      },
      attachments: [
        {
          filename: `receipt-${recordId}.pdf`,
          content: pdf
        }
      ]
    });
    
    return true;
  }
  
  private async checkInventoryAvailability(pharmacyId: string, medications: any[]) {
    const unavailableItems: any[] = [];
    let available = true;
    
    for (const med of medications) {
      const inventoryItem = await db.query.pharmacyInventory.findFirst({
        where: and(
          eq(pharmacyInventory.id, med.inventoryItemId),
          eq(pharmacyInventory.pharmacyId, pharmacyId)
        )
      });
      
      if (!inventoryItem || inventoryItem.quantity < med.quantity) {
        available = false;
        unavailableItems.push({
          medicineId: med.medicineId,
          name: med.name,
          requested: med.quantity,
          available: inventoryItem?.quantity || 0
        });
      }
    }
    
    return { available, unavailableItems };
  }
  
  private async updateInventoryQuantities(pharmacyId: string, medications: any[]) {
    for (const med of medications) {
      await db
        .update(pharmacyInventory)
        .set({
          quantity: sql`${pharmacyInventory.quantity} - ${med.quantity}`,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(pharmacyInventory.id, med.inventoryItemId),
            eq(pharmacyInventory.pharmacyId, pharmacyId)
          )
        );
      
      // Check if stock is low after update
      const updated = await db.query.pharmacyInventory.findFirst({
        where: eq(pharmacyInventory.id, med.inventoryItemId)
      });
      
      if (updated && updated.quantity <= updated.minStockLevel) {
        // Create low stock notification
        await this.createLowStockNotification(pharmacyId, updated);
      }
    }
  }
  
  private async notifyPrescriptionDispensed(prescription: any, record: any) {
    // Notify doctor
    if (prescription.doctorId) {
      await db.insert(notifications).values({
        userId: prescription.doctorId,
        type: 'prescription_dispensed',
        title: 'Prescription Dispensed',
        message: `Your prescription for ${prescription.patientName} has been dispensed`,
        entityType: 'prescription',
        entityId: prescription.id,
        priority: 'normal',
        createdAt: new Date()
      });
    }
    
    // Send SMS to patient if phone number available
    if (prescription.patientPhone) {
      // TODO: Implement SMS notification
    }
  }
  
  private async createLowStockNotification(pharmacyId: string, item: any) {
    // Get pharmacy staff
    const staff = await db.query.pharmacyStaff.findMany({
      where: eq(pharmacyStaff.pharmacyId, pharmacyId)
    });
    
    // Create notification for each staff member
    for (const member of staff) {
      await db.insert(notifications).values({
        userId: member.userId,
        type: 'inventory_alert',
        title: 'Low Stock Alert',
        message: `Stock is running low for inventory item`,
        entityType: 'inventory',
        entityId: item.id,
        priority: 'high',
        createdAt: new Date()
      });
    }
  }
}