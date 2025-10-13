// Sprint 2 - Authentication Middleware
// ------------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        email: string;
        role: string;
        tenantId?: string;
        permissions: string[];
      };
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Token should be validated by API Gateway
    // Gateway adds user info to headers
    const userId = req.headers['x-user-id'] as string;
    const email = req.headers['x-user-email'] as string;
    const role = req.headers['x-user-role'] as string;
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId || !email || !role) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }
    
    req.user = {
      userId,
      email,
      role,
      tenantId,
      permissions: [] // TODO: Add permissions from token
    };
    
    next();
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
    
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed'
      }
    });
  }
}

export function authorize(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource'
        }
      });
    }
    
    next();
  };
}

// ------------------------------------------------------------------------------