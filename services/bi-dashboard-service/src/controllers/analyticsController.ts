import { Request, Response } from 'express';
import { analyticsService } from '../services/analyticsService';
import { logger } from '../utils/logger';

export class AnalyticsController {
  async getMetrics(req: Request, res: Response) {
    try {
      const { organizationId } = req.query;
      const metrics = await analyticsService.getSystemMetrics(organizationId as string);
      res.json({ success: true, data: metrics });
    } catch (error: any) {
      logger.error('Failed to get metrics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAppointmentTrends(req: Request, res: Response) {
    try {
      const { days = 30, organizationId } = req.query;
      const trends = await analyticsService.getAppointmentTrends(parseInt(days as string), organizationId as string);
      res.json({ success: true, data: trends });
    } catch (error: any) {
      logger.error('Failed to get appointment trends:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getTopDoctors(req: Request, res: Response) {
    try {
      const { limit = 10, organizationId } = req.query;
      const doctors = await analyticsService.getTopDoctors(parseInt(limit as string), organizationId as string);
      res.json({ success: true, data: doctors });
    } catch (error: any) {
      logger.error('Failed to get top doctors:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const analyticsController = new AnalyticsController();
