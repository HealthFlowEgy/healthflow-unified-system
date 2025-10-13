import { Request, Response } from 'express';
import { pushNotificationService } from '../services/pushNotificationService';
import { syncService } from '../services/syncService';
import { logger } from '../utils/logger';

export const mobileController = {
  async registerPushToken(req: Request, res: Response) {
    try {
      const { token, deviceId, deviceName, deviceType, platform, platformVersion, appVersion } = req.body;
      const userId = (req as any).user.id;
      const tenantId = (req as any).user.tenantId;

      const result = await pushNotificationService.registerToken({
        userId,
        token,
        deviceId,
        deviceName,
        deviceType,
        platform,
        platformVersion,
        appVersion,
        tenantId
      });

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Register push token error:', error);
      res.status(500).json({ success: false, error: 'Failed to register push token' });
    }
  },

  async getPendingSync(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const tenantId = (req as any).user.tenantId;

      const pending = await syncService.getPendingSync(userId, tenantId);

      res.json({ success: true, data: pending });
    } catch (error) {
      logger.error('Get pending sync error:', error);
      res.status(500).json({ success: false, error: 'Failed to get pending sync' });
    }
  },

  async uploadSync(req: Request, res: Response) {
    try {
      const { entityType, entityId, action, data } = req.body;
      const userId = (req as any).user.id;
      const tenantId = (req as any).user.tenantId;

      const result = await syncService.addToQueue({
        userId,
        entityType,
        entityId,
        action,
        data,
        tenantId
      });

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Upload sync error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload sync' });
    }
  }
};
