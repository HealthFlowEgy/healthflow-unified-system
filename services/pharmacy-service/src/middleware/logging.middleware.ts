// Sprint 2 - Request Logging Middleware
// ------------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  const startTime = Date.now();
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      userId: req.user?.userId
    });
  });
  
  next();
}

// ------------------------------------------------------------------------------