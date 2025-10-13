import { Router, Request, Response } from 'express';
import { db } from '../../../database/connection';
import { pharmacies, users } from '../../../database/schema';
import { eq, and, like, or } from 'drizzle-orm';
import { authorize } from '../middleware/auth';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Register pharmacy
router.post('/register', authorize('pharmacist', 'admin'), async (req: Request, res: Response) => {
  try {
    const {
      name,
      licenseNumber,
      phoneNumber,
      email,
      address,
      city,
      governorate,
      coordinates
    } = req.body;
    
    // Validate required fields
    if (!name || !licenseNumber || !phoneNumber || !address || !city || !governorate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields'
        }
      });
    }
    
    // Check if license number already exists
    const existing = await db.query.pharmacies.findFirst({
      where: eq(pharmacies.licenseNumber, licenseNumber)
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_LICENSE',
          message: 'A pharmacy with this license number already exists'
        }
      });
    }
    
    // Create pharmacy
    const [pharmacy] = await db.insert(pharmacies).values({
      name,
      licenseNumber,
      phoneNumber,
      email,
      address,
      city,
      governorate,
      coordinates: coordinates ? JSON.stringify(coordinates) : null,
      ownerId: req.user!.userId,
      status: 'pending'
    }).returning();
    
    logger.info('Pharmacy registered', {
      pharmacyId: pharmacy.id,
      userId: req.user!.userId
    });
    
    res.status(201).json({
      success: true,
      message: 'Pharmacy registered successfully',
      data: pharmacy
    });
  } catch (error) {
    logger.error('Pharmacy registration failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Failed to register pharmacy'
      }
    });
  }
});

// List pharmacies
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      city,
      governorate,
      search
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let conditions: any[] = [];
    
    // Filter by status
    if (status) {
      conditions.push(eq(pharmacies.status, status as any));
    }
    
    // Filter by city
    if (city) {
      conditions.push(eq(pharmacies.city, city as string));
    }
    
    // Filter by governorate
    if (governorate) {
      conditions.push(eq(pharmacies.governorate, governorate as string));
    }
    
    // Search by name
    if (search) {
      conditions.push(like(pharmacies.name, `%${search}%`));
    }
    
    // If pharmacist, only show their pharmacies
    if (req.user!.role === 'pharmacist') {
      conditions.push(eq(pharmacies.ownerId, req.user!.userId));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const results = await db.query.pharmacies.findMany({
      where: whereClause,
      limit: limitNum,
      offset: offset,
      orderBy: (pharmacies, { desc }) => [desc(pharmacies.createdAt)]
    });
    
    // Get total count
    const total = await db.query.pharmacies.findMany({
      where: whereClause
    });
    
    res.json({
      success: true,
      data: {
        pharmacies: results,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total.length,
          totalPages: Math.ceil(total.length / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to list pharmacies', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_FAILED',
        message: 'Failed to retrieve pharmacies'
      }
    });
  }
});

// Get pharmacy by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const pharmacy = await db.query.pharmacies.findFirst({
      where: eq(pharmacies.id, id)
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
    
    // Check access for pharmacists
    if (req.user!.role === 'pharmacist' && pharmacy.ownerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this pharmacy'
        }
      });
    }
    
    res.json({
      success: true,
      data: pharmacy
    });
  } catch (error) {
    logger.error('Failed to get pharmacy', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to retrieve pharmacy'
      }
    });
  }
});

// Update pharmacy
router.put('/:id', authorize('pharmacist', 'admin', 'eda_officer'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Get existing pharmacy
    const existing = await db.query.pharmacies.findFirst({
      where: eq(pharmacies.id, id)
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHARMACY_NOT_FOUND',
          message: 'Pharmacy not found'
        }
      });
    }
    
    // Check access for pharmacists
    if (req.user!.role === 'pharmacist' && existing.ownerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this pharmacy'
        }
      });
    }
    
    // Update pharmacy
    const [updated] = await db.update(pharmacies)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(pharmacies.id, id))
      .returning();
    
    logger.info('Pharmacy updated', {
      pharmacyId: id,
      userId: req.user!.userId
    });
    
    res.json({
      success: true,
      message: 'Pharmacy updated successfully',
      data: updated
    });
  } catch (error) {
    logger.error('Failed to update pharmacy', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: 'Failed to update pharmacy'
      }
    });
  }
});

// Update pharmacy status
router.patch('/:id/status', authorize('admin', 'eda_officer'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'active', 'suspended', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Invalid status value'
        }
      });
    }
    
    const [updated] = await db.update(pharmacies)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(pharmacies.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHARMACY_NOT_FOUND',
          message: 'Pharmacy not found'
        }
      });
    }
    
    logger.info('Pharmacy status updated', {
      pharmacyId: id,
      status,
      userId: req.user!.userId
    });
    
    res.json({
      success: true,
      message: 'Pharmacy status updated successfully',
      data: updated
    });
  } catch (error) {
    logger.error('Failed to update pharmacy status', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_UPDATE_FAILED',
        message: 'Failed to update pharmacy status'
      }
    });
  }
});

// Delete pharmacy (soft delete)
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [deleted] = await db.update(pharmacies)
      .set({
        deletedAt: new Date()
      })
      .where(eq(pharmacies.id, id))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHARMACY_NOT_FOUND',
          message: 'Pharmacy not found'
        }
      });
    }
    
    logger.warn('Pharmacy deleted', {
      pharmacyId: id,
      userId: req.user!.userId
    });
    
    res.json({
      success: true,
      message: 'Pharmacy deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete pharmacy', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete pharmacy'
      }
    });
  }
});

export default router;

