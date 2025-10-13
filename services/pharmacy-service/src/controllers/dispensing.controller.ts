// Sprint 2 - Dispensing Controller
// ------------------------------------------------------------------------------

import { Request, Response } from 'express';
import { DispensingService } from '../services/dispensing.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class DispensingController {
  private service = new DispensingService();
  
  getPendingPrescriptions = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const { page = 1, limit = 20, priority } = req.query;
      
      const result = await this.service.getPendingPrescriptions(pharmacyId, {
        page: Number(page),
        limit: Number(limit),
        priority: priority as string
      });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get pending prescriptions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to retrieve pending prescriptions'
        }
      });
    }
  };
  
  searchPrescriptions = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const { 
        prescriptionNumber, 
        patientName, 
        patientPhone,
        doctorName,
        dateFrom,
        dateTo
      } = req.query;
      
      const prescriptions = await this.service.searchPrescriptions(pharmacyId, {
        prescriptionNumber: prescriptionNumber as string,
        patientName: patientName as string,
        patientPhone: patientPhone as string,
        doctorName: doctorName as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string
      });
      
      res.json({
        success: true,
        data: prescriptions
      });
    } catch (error) {
      logger.error('Failed to search prescriptions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search prescriptions'
        }
      });
    }
  };
  
  getPrescription = async (req: Request, res: Response) => {
    try {
      const { pharmacyId, prescriptionId } = req.params;
      
      const prescription = await this.service.getPrescription(
        pharmacyId,
        prescriptionId
      );
      
      if (!prescription) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PRESCRIPTION_NOT_FOUND',
            message: 'Prescription not found'
          }
        });
      }
      
      res.json({
        success: true,
        data: prescription
      });
    } catch (error) {
      logger.error('Failed to get prescription:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to retrieve prescription'
        }
      });
    }
  };
  
  verifyPrescription = async (req: Request, res: Response) => {
    try {
      const { pharmacyId, prescriptionId } = req.params;
      const { verificationMethod, verificationData } = req.body;
      
      const result = await this.service.verifyPrescription(
        pharmacyId,
        prescriptionId,
        {
          method: verificationMethod,
          data: verificationData,
          verifiedBy: req.user.userId
        }
      );
      
      logger.info(`Prescription verified: ${prescriptionId}`, {
        userId: req.user.userId,
        pharmacyId,
        method: verificationMethod
      });
      
      res.json({
        success: true,
        message: 'Prescription verified successfully',
        data: result
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
      
      logger.error('Failed to verify prescription:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: 'Failed to verify prescription'
        }
      });
    }
  };
  
  dispensePrescription = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const dispensingData = req.body;
      
      const result = await this.service.dispensePrescription(
        pharmacyId,
        {
          ...dispensingData,
          dispensedBy: req.user.userId
        }
      );
      
      logger.info(`Prescription dispensed: ${dispensingData.prescriptionId}`, {
        userId: req.user.userId,
        pharmacyId,
        recordId: result.id,
        totalAmount: result.totalAmount
      });
      
      res.status(201).json({
        success: true,
        message: 'Prescription dispensed successfully',
        data: result
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
      
      logger.error('Failed to dispense prescription:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DISPENSING_FAILED',
          message: 'Failed to dispense prescription'
        }
      });
    }
  };
  
  partialDispensing = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const dispensingData = req.body;
      
      const result = await this.service.partialDispensing(
        pharmacyId,
        {
          ...dispensingData,
          dispensedBy: req.user.userId
        }
      );
      
      logger.info(`Partial dispensing completed: ${dispensingData.prescriptionId}`, {
        userId: req.user.userId,
        pharmacyId,
        recordId: result.id
      });
      
      res.status(201).json({
        success: true,
        message: 'Partial dispensing completed',
        data: result
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
      
      logger.error('Failed partial dispensing:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PARTIAL_DISPENSING_FAILED',
          message: 'Failed to process partial dispensing'
        }
      });
    }
  };
  
  getDispensingHistory = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const { 
        page = 1, 
        limit = 20, 
        dateFrom, 
        dateTo,
        status 
      } = req.query;
      
      const result = await this.service.getDispensingHistory(pharmacyId, {
        page: Number(page),
        limit: Number(limit),
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        status: status as string
      });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get dispensing history:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to retrieve dispensing history'
        }
      });
    }
  };
  
  getDispensingRecord = async (req: Request, res: Response) => {
    try {
      const { pharmacyId, recordId } = req.params;
      
      const record = await this.service.getDispensingRecord(
        pharmacyId,
        recordId
      );
      
      if (!record) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RECORD_NOT_FOUND',
            message: 'Dispensing record not found'
          }
        });
      }
      
      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      logger.error('Failed to get dispensing record:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to retrieve dispensing record'
        }
      });
    }
  };
  
  printReceipt = async (req: Request, res: Response) => {
    try {
      const { pharmacyId, recordId } = req.params;
      
      const receipt = await this.service.generateReceipt(
        pharmacyId,
        recordId
      );
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${recordId}.pdf"`);
      res.send(receipt);
    } catch (error) {
      logger.error('Failed to print receipt:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PRINT_FAILED',
          message: 'Failed to generate receipt'
        }
      });
    }
  };
  
  emailReceipt = async (req: Request, res: Response) => {
    try {
      const { pharmacyId, recordId } = req.params;
      const { email } = req.body;
      
      await this.service.emailReceipt(pharmacyId, recordId, email);
      
      logger.info(`Receipt emailed for record ${recordId}`, {
        userId: req.user.userId,
        pharmacyId,
        email
      });
      
      res.json({
        success: true,
        message: 'Receipt sent to email successfully'
      });
    } catch (error) {
      logger.error('Failed to email receipt:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_FAILED',
          message: 'Failed to send receipt'
        }
      });
    }
  };
}