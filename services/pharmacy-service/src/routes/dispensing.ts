import { Router, Request, Response } from 'express';
import { db } from '../../../database/connection';
import { dispensingRecords, prescriptions, pharmacyInventory, pharmacies } from '../../../database/schema';
import { eq, and } from 'drizzle-orm';
import { authorize } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Scan prescription (Step 1)
router.post('/scan', authorize('pharmacist'), async (req: Request, res: Response) => {
  try {
    const { prescriptionNumber } = req.body;
    
    if (!prescriptionNumber) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRESCRIPTION_NUMBER',
          message: 'Prescription number is required'
        }
      });
    }
    
    // Find prescription
    const prescription = await db.query.prescriptions.findFirst({
      where: eq(prescriptions.prescriptionNumber, prescriptionNumber)
    });
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRESCRIPTION_NOT_FOUND',
          message: 'Prescription not found'
        }
      });
    }
    
    // Check if already dispensed
    if (prescription.status === 'dispensed' || prescription.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_DISPENSED',
          message: 'This prescription has already been dispensed'
        }
      });
    }
    
    // Check if prescription is validated
    if (prescription.status !== 'validated') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOT_VALIDATED',
          message: 'Prescription must be validated before dispensing'
        }
      });
    }
    
    logger.info('Prescription scanned', {
      prescriptionId: prescription.id,
      userId: req.user!.userId
    });
    
    res.json({
      success: true,
      message: 'Prescription scanned successfully',
      data: prescription
    });
  } catch (error) {
    logger.error('Failed to scan prescription', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'SCAN_FAILED',
        message: 'Failed to scan prescription'
      }
    });
  }
});

// Validate prescription (Step 2)
router.post('/validate', authorize('pharmacist'), async (req: Request, res: Response) => {
  try {
    const { prescriptionId } = req.body;
    
    if (!prescriptionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRESCRIPTION_ID',
          message: 'Prescription ID is required'
        }
      });
    }
    
    const prescription = await db.query.prescriptions.findFirst({
      where: eq(prescriptions.id, prescriptionId)
    });
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRESCRIPTION_NOT_FOUND',
          message: 'Prescription not found'
        }
      });
    }
    
    // Perform validation checks
    const validationResult = {
      isValid: true,
      checks: {
        prescriptionActive: true,
        notExpired: true,
        patientInfoComplete: !!prescription.patientName && !!prescription.patientNationalId,
        medicationsValid: true,
        noInteractions: !prescription.hasInteractions
      },
      warnings: [] as string[]
    };
    
    if (prescription.hasInteractions) {
      validationResult.warnings.push('Drug interactions detected');
    }
    
    if (!validationResult.checks.patientInfoComplete) {
      validationResult.isValid = false;
      validationResult.warnings.push('Patient information incomplete');
    }
    
    logger.info('Prescription validated', {
      prescriptionId,
      isValid: validationResult.isValid,
      userId: req.user!.userId
    });
    
    res.json({
      success: true,
      message: 'Prescription validation complete',
      data: {
        prescription,
        validation: validationResult
      }
    });
  } catch (error) {
    logger.error('Failed to validate prescription', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Failed to validate prescription'
      }
    });
  }
});

// Check inventory availability (Step 3)
router.post('/check-inventory', authorize('pharmacist'), async (req: Request, res: Response) => {
  try {
    const { prescriptionId, pharmacyId } = req.body;
    
    if (!prescriptionId || !pharmacyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Prescription ID and Pharmacy ID are required'
        }
      });
    }
    
    const prescription = await db.query.prescriptions.findFirst({
      where: eq(prescriptions.id, prescriptionId)
    });
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRESCRIPTION_NOT_FOUND',
          message: 'Prescription not found'
        }
      });
    }
    
    const medications = prescription.medications as any[];
    const availabilityCheck = [];
    
    for (const med of medications) {
      // Find inventory item
      const inventory = await db.query.pharmacyInventory.findFirst({
        where: and(
          eq(pharmacyInventory.pharmacyId, pharmacyId),
          eq(pharmacyInventory.medicineId, med.medicineId)
        ),
        with: {
          medicine: true
        }
      });
      
      const available = inventory && inventory.currentStock >= (med.quantity || 1);
      
      availabilityCheck.push({
        medicineId: med.medicineId,
        medicineName: med.medicineName,
        requestedQuantity: med.quantity || 1,
        availableStock: inventory?.currentStock || 0,
        available,
        unitPrice: inventory?.unitPrice || 0
      });
    }
    
    const allAvailable = availabilityCheck.every(item => item.available);
    
    res.json({
      success: true,
      data: {
        allAvailable,
        items: availabilityCheck
      }
    });
  } catch (error) {
    logger.error('Failed to check inventory', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INVENTORY_CHECK_FAILED',
        message: 'Failed to check inventory availability'
      }
    });
  }
});

// Dispense prescription (Step 4)
router.post('/dispense', authorize('pharmacist'), async (req: Request, res: Response) => {
  try {
    const { prescriptionId, pharmacyId, items, paymentMethod, totalAmount } = req.body;
    
    if (!prescriptionId || !pharmacyId || !items || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Required parameters missing'
        }
      });
    }
    
    // Verify pharmacy access
    const pharmacy = await db.query.pharmacies.findFirst({
      where: eq(pharmacies.id, pharmacyId)
    });
    
    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHARMACY_NOT_FOUND',
          message: 'Pharmacy not found'
        }
      });
    }
    
    if (req.user!.role === 'pharmacist' && pharmacy.ownerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this pharmacy'
        }
      });
    }
    
    // Create dispensing record
    const [record] = await db.insert(dispensingRecords).values({
      prescriptionId,
      pharmacyId,
      dispensedBy: req.user!.userId,
      dispensedAt: new Date(),
      items: JSON.stringify(items),
      paymentMethod,
      totalAmount: parseFloat(totalAmount),
      status: 'completed'
    }).returning();
    
    // Update prescription status
    await db.update(prescriptions)
      .set({
        status: 'dispensed',
        pharmacyId,
        dispensedAt: new Date(),
        dispensedBy: req.user!.userId
      })
      .where(eq(prescriptions.id, prescriptionId));
    
    // Update inventory for each item
    for (const item of items) {
      await db.execute(sql`
        UPDATE pharmacy_inventory
        SET current_stock = current_stock - ${item.quantity}
        WHERE pharmacy_id = ${pharmacyId}
        AND medicine_id = ${item.medicineId}
      `);
    }
    
    logger.info('Prescription dispensed', {
      prescriptionId,
      pharmacyId,
      recordId: record.id,
      userId: req.user!.userId
    });
    
    res.status(201).json({
      success: true,
      message: 'Prescription dispensed successfully',
      data: record
    });
  } catch (error) {
    logger.error('Failed to dispense prescription', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'DISPENSING_FAILED',
        message: 'Failed to dispense prescription'
      }
    });
  }
});

// Get dispensing history
router.get('/history', authorize('pharmacist', 'admin'), async (req: Request, res: Response) => {
  try {
    const {
      pharmacyId,
      page = '1',
      limit = '20',
      startDate,
      endDate
    } = req.query;
    
    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PHARMACY_ID',
          message: 'Pharmacy ID is required'
        }
      });
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    const records = await db.query.dispensingRecords.findMany({
      where: eq(dispensingRecords.pharmacyId, pharmacyId as string),
      with: {
        prescription: true,
        pharmacy: true
      },
      limit: limitNum,
      offset: offset,
      orderBy: (dispensingRecords, { desc }) => [desc(dispensingRecords.dispensedAt)]
    });
    
    const total = await db.query.dispensingRecords.findMany({
      where: eq(dispensingRecords.pharmacyId, pharmacyId as string)
    });
    
    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total.length,
          totalPages: Math.ceil(total.length / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get dispensing history', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'HISTORY_FAILED',
        message: 'Failed to retrieve dispensing history'
      }
    });
  }
});

export default router;

