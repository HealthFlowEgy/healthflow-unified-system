import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/api/v2/auth/register',
  '/api/v2/auth/login',
  '/api/v2/auth/forgot-password',
  '/api/v2/auth/reset-password',
  '/api/v2/auth/verify-email',
  '/health',
  '/metrics'
];

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  permissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      id?: string;
      startTime?: number;
    }
  }
}

export const authenticateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Add request ID and start time
  req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();
  
  // Check if endpoint is public
  const isPublic = PUBLIC_ENDPOINTS.some(endpoint => 
    req.path.startsWith(endpoint)
  );
  
  if (isPublic) {
    return next();
  }
  
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    logger.warn('Missing authorization header', {
      path: req.path,
      method: req.method,
      ip: req.ip
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
  
  // Check Bearer token format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.warn('Invalid authorization header format', {
      path: req.path,
      method: req.method
    });
    
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN_FORMAT',
        message: 'Authorization header must be in format: Bearer <token>'
      }
    });
    return;
  }
  
  const token = parts[1];
  
  try {
    // Verify JWT token
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      logger.error('JWT_ACCESS_SECRET not configured');
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Authentication service misconfigured'
        }
      });
      return;
    }
    
    const decoded = jwt.verify(token, secret) as JWTPayload;
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
      permissions: decoded.permissions || []
    };
    
    logger.debug('Request authenticated', {
      userId: req.user.userId,
      role: req.user.role,
      path: req.path,
      method: req.method
    });
    
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expired', {
        path: req.path,
        method: req.method
      });
      
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired. Please refresh your token.'
        }
      });
      return;
    }
    
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token', {
        path: req.path,
        method: req.method,
        error: error.message
      });
      
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token'
        }
      });
      return;
    }
    
    logger.error('Token verification failed', {
      error: error.message,
      path: req.path,
      method: req.method
    });
    
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed'
      }
    });
  }
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles: string[]) => {
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
        requiredRoles: allowedRoles,
        path: req.path
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

