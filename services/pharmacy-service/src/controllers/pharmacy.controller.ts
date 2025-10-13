// Sprint 2 - Pharmacy Controller Implementation
// ------------------------------------------------------------------------------

import { Request, Response } from 'express';
import { PharmacyService } from '../services/pharmacy.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class PharmacyController {
  private service = new PharmacyService();
  
  registerPharmacy = async (req: Request, res: Response) => {
    try {
      const pharmacyData = req.body;
      const userId = req.user.userId;
      
      // Check if user is authorized to register pharmacy
      if (!['pharmacist', 'admin'].includes(req.user.role)) {
        throw new AppError('FORBIDDEN', 'Only pharmacists can register pharmacies', 403);
      }
      
      const pharmacy = await this.service.registerPharmacy(pharmacyData, userId);
      
      logger.info(`Pharmacy registered: ${pharmacy.id}`, {
        userId,
        pharmacyId: pharmacy.id
      });
      
      res.status(201).json({
        success: true,
        message: 'Pharmacy registered successfully',
        data: pharmacy
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }
      
      logger.error('Pharmacy registration failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to register pharmacy'
        }
      });
    }
  };
  
  listPharmacies = async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        city,
        governorate,
        search
      } = req.query;
      
      const filters = {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        city: city as string,
        governorate: governorate as string,
        search: search as string
      };
      
      // If user is pharmacist, only show their pharmacies
      if (req.user.role === 'pharmacist') {
        filters.userId = req.user.userId;
      }
      
      const result = await this.service.listPharmacies(filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to list pharmacies:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: 'Failed to retrieve pharmacies'
        }
      });
    }
  };
  
  getPharmacy = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const pharmacy = await this.service.getPharmacy(id);
      
      if (!pharmacy) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PHARMACY_NOT_FOUND',
            message: 'Pharmacy not found'
          }
        });
      }
      
      // Check access permissions
      if (req.user.role === 'pharmacist') {
        const hasAccess = await this.service.checkUserAccess(id, req.user.userId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'You do not have access to this pharmacy'
            }
          });
        }
      }
      
      res.json({
        success: true,
        data: pharmacy
      });
    } catch (error) {
      logger.error('Failed to get pharmacy:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to retrieve pharmacy'
        }
      });
    }
  };
  
  updatePharmacy = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Verify access
      if (req.user.role === 'pharmacist') {
        const hasAccess = await this.service.checkUserAccess(id, req.user.userId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'You do not have access to this pharmacy'
            }
          });
        }
      }
      
      const pharmacy = await this.service.updatePharmacy(id, updates);
      
      logger.info(`Pharmacy updated: ${id}`, {
        userId: req.user.userId,
        updates: Object.keys(updates)
      });
      
      res.json({
        success: true,
        message: 'Pharmacy updated successfully',
        data: pharmacy
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }
      
      logger.error('Failed to update pharmacy:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update pharmacy'
        }
      });
    }
  };
  
  deletePharmacy = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      await this.service.deletePharmacy(id);
      
      logger.warn(`Pharmacy deleted: ${id}`, {
        userId: req.user.userId
      });
      
      res.json({
        success: true,
        message: 'Pharmacy deleted successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }
      
      logger.error('Failed to delete pharmacy:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete pharmacy'
        }
      });
    }
  };
  
  addStaffMember = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const staffData = req.body;
      
      // Verify pharmacy access
      const hasAccess = await this.service.checkUserAccess(id, req.user.userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this pharmacy'
          }
        });
      }
      
      const staff = await this.service.addStaffMember(id, staffData);
      
      logger.info(`Staff member added to pharmacy ${id}`, {
        userId: req.user.userId,
        staffUserId: staffData.userId
      });
      
      res.status(201).json({
        success: true,
        message: 'Staff member added successfully',
        data: staff
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }
      
      logger.error('Failed to add staff member:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ADD_STAFF_FAILED',
          message: 'Failed to add staff member'
        }
      });
    }
  };
  
  getStaff = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const staff = await this.service.getStaff(id);
      
      res.json({
        success: true,
        data: staff
      });
    } catch (error) {
      logger.error('Failed to get staff:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_STAFF_FAILED',
          message: 'Failed to retrieve staff'
        }
      });
    }
  };
  
  removeStaffMember = async (req: Request, res: Response) => {
    try {
      const { id, staffId } = req.params;
      
      // Verify pharmacy access
      const hasAccess = await this.service.checkUserAccess(id, req.user.userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this pharmacy'
          }
        });
      }
      
      await this.service.removeStaffMember(id, staffId);
      
      logger.info(`Staff member removed from pharmacy ${id}`, {
        userId: req.user.userId,
        staffId
      });
      
      res.json({
        success: true,
        message: 'Staff member removed successfully'
      });
    } catch (error) {
      logger.error('Failed to remove staff member:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REMOVE_STAFF_FAILED',
          message: 'Failed to remove staff member'
        }
      });
    }
  };
  
  updateStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      
      const pharmacy = await this.service.updateStatus(id, status, reason);
      
      logger.info(`Pharmacy status updated: ${id}`, {
        userId: req.user.userId,
        newStatus: status,
        reason
      });
      
      res.json({
        success: true,
        message: 'Pharmacy status updated',
        data: pharmacy
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }
      
      logger.error('Failed to update status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_UPDATE_FAILED',
          message: 'Failed to update pharmacy status'
        }
      });
    }
  };
  
  verifyPharmacy = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const verifierId = req.user.userId;
      
      const pharmacy = await this.service.verifyPharmacy(id, verifierId);
      
      logger.info(`Pharmacy verified: ${id}`, {
        verifierId
      });
      
      res.json({
        success: true,
        message: 'Pharmacy verified successfully',
        data: pharmacy
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }
      
      logger.error('Failed to verify pharmacy:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: 'Failed to verify pharmacy'
        }
      });
    }
  };
  
  findNearby = async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, radius = 5 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_COORDINATES',
            message: 'Latitude and longitude are required'
          }
        });
      }
      
      const pharmacies = await this.service.findNearby({
        latitude: Number(latitude),
        longitude: Number(longitude),
        radius: Number(radius)
      });
      
      res.json({
        success: true,
        data: pharmacies
      });
    } catch (error) {
      logger.error('Failed to find nearby pharmacies:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to find nearby pharmacies'
        }
      });
    }
  };
  
  searchByCity = async (req: Request, res: Response) => {
    try {
      const { city, governorate } = req.query;
      
      if (!city && !governorate) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'City or governorate is required'
          }
        });
      }
      
      const pharmacies = await this.service.searchByLocation({
        city: city as string,
        governorate: governorate as string
      });
      
      res.json({
        success: true,
        data: pharmacies
      });
    } catch (error) {
      logger.error('Failed to search pharmacies:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search pharmacies'
        }
      });
    }
  };
}

// ------------------------------------------------------------------------------