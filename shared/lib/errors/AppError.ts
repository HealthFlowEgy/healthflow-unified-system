/**
 * Custom application error classes for consistent error handling
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, true, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, true, 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, true, 'DATABASE_ERROR', details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`External service error: ${service} - ${message}`, 503, true, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * Error response formatter
 */
export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: any;
    stack?: string;
  };
  requestId?: string;
  timestamp: string;
}

export function formatErrorResponse(
  error: AppError | Error,
  requestId?: string,
  includeStack: boolean = false
): ErrorResponse {
  const isAppError = error instanceof AppError;

  return {
    error: {
      message: error.message,
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      statusCode: isAppError ? error.statusCode : 500,
      details: isAppError ? error.details : undefined,
      stack: includeStack ? error.stack : undefined
    },
    requestId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if error is operational (expected) or programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Error handler middleware factory
 */
export function createErrorHandler(logger: any) {
  return (err: Error, req: any, res: any, next: any) => {
    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;
    const requestId = req.headers['x-request-id'];

    // Log error
    if (statusCode >= 500) {
      logger.error('Server error', {
        error: err.message,
        stack: err.stack,
        requestId,
        path: req.path,
        method: req.method
      });
    } else {
      logger.warn('Client error', {
        error: err.message,
        requestId,
        path: req.path,
        method: req.method
      });
    }

    // Send error response
    const includeStack = process.env.NODE_ENV === 'development';
    const errorResponse = formatErrorResponse(err, requestId, includeStack);

    res.status(statusCode).json(errorResponse);
  };
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default AppError;
