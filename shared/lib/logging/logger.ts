import winston from 'winston';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  service: string;
  requestId?: string;
  userId?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Create a structured logger for a service
 */
export function createLogger(serviceName: string): winston.Logger {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const environment = process.env.NODE_ENV || 'development';

  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: {
      service: serviceName,
      environment
    },
    transports: [
      // Console transport for all environments
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
          })
        )
      })
    ]
  });

  // Add file transports for production
  if (environment === 'production') {
    logger.add(
      new winston.transports.File({
        filename: `/var/log/healthflow/${serviceName}-error.log`,
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    );

    logger.add(
      new winston.transports.File({
        filename: `/var/log/healthflow/${serviceName}-combined.log`,
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    );
  }

  return logger;
}

/**
 * Log with context
 */
export function logWithContext(
  logger: winston.Logger,
  level: LogLevel,
  message: string,
  context?: Partial<LogContext>
): void {
  logger.log(level, message, context);
}

/**
 * Log authentication events
 */
export function logAuthEvent(
  logger: winston.Logger,
  event: 'login' | 'logout' | 'register' | 'password_reset' | 'mfa_enabled',
  userId: string,
  success: boolean,
  metadata?: Record<string, any>
): void {
  logger.info('Authentication event', {
    event,
    userId,
    success,
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log prescription events
 */
export function logPrescriptionEvent(
  logger: winston.Logger,
  event: 'created' | 'validated' | 'dispensed' | 'cancelled',
  prescriptionId: string,
  userId: string,
  metadata?: Record<string, any>
): void {
  logger.info('Prescription event', {
    event,
    prescriptionId,
    userId,
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log security events
 */
export function logSecurityEvent(
  logger: winston.Logger,
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any>
): void {
  logger.warn('Security event', {
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...details
  });
}

/**
 * Log API requests
 */
export function logApiRequest(
  logger: winston.Logger,
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: string,
  requestId?: string
): void {
  const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
  
  logger.log(level, 'API request', {
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
    userId,
    requestId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log errors with stack trace
 */
export function logError(
  logger: winston.Logger,
  error: Error,
  context?: Partial<LogContext>
): void {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
    timestamp: new Date().toISOString()
  });
}

/**
 * Create audit log entry
 */
export function createAuditLog(
  logger: winston.Logger,
  action: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  changes?: Record<string, any>
): void {
  logger.info('Audit log', {
    action,
    userId,
    resourceType,
    resourceId,
    changes,
    timestamp: new Date().toISOString()
  });
}

export default createLogger;
