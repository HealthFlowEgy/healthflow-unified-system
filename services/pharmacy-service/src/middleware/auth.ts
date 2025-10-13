import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        tenantId?: string;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Extract user info from headers (set by API Gateway)
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId || !userEmail || !userRole) {
      logger.warn('Missing user headers', {
        path: req.path,
        headers: req.headers
      });
      
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }
    
    // Attach user to request
    req.user = {
      userId,
      email: userEmail,
      role: userRole,
      tenantId
    };
    
    next();
  } catch (error) {
    logger.error('Authentication failed', { error });
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed'
      }
    });
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: allowedRoles
      });
      
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource'
        }
      });
      return;
    }
    
    next();
  };
};

