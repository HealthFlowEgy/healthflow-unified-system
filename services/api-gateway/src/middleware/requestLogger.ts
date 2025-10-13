import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { MetricsService } from '../services/metrics';

export const requestLogger = (metricsService: MetricsService) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Log request
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // Capture response
    const originalSend = res.send;
    res.send = function (data: any): Response {
      const duration = Date.now() - startTime;
      
      // Log response
      logger.info('Outgoing response', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
      
      // Record metrics
      metricsService.recordRequest({
        service: 'gateway',
        method: req.method,
        statusCode: res.statusCode,
        duration
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

