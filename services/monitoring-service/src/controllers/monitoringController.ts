import { Request, Response } from 'express';
import { metricsService } from '../services/metricsService';

export const monitoringController = {
  async getMetrics(req: Request, res: Response) {
    try {
      const metrics = await metricsService.getMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get metrics' });
    }
  }
};
