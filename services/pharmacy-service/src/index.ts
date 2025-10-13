// Sprint 2 - Complete Pharmacy Backend Service

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { db } from './database/connection';
import winston from 'winston';

// Routes
import pharmacyRoutes from './routes/pharmacy.routes';
import inventoryRoutes from './routes/inventory.routes';
import dispensingRoutes from './routes/dispensing.routes';
import reportsRoutes from './routes/reports.routes';

// Middleware
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { authenticate } from './middleware/auth.middleware';

// ============================================================================
// LOGGER SETUP
// ============================================================================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pharmacy-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(requestLogger);

// ============================================================================
// ROUTES
// ============================================================================

// Health check (public)
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await db.execute({ sql: 'SELECT 1', values: [] });
    
    res.json({
      status: 'healthy',
      service: 'pharmacy-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'pharmacy-service',
      error: error.message
    });
  }
});

// API routes (protected)
app.use('/api/v2/pharmacy', authenticate, pharmacyRoutes);
app.use('/api/v2/inventory', authenticate, inventoryRoutes);
app.use('/api/v2/dispensing', authenticate, dispensingRoutes);
app.use('/api/v2/reports', authenticate, reportsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      path: req.path
    }
  });
});

// Error handler
app.use(errorHandler);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = parseInt(process.env.PORT || '4001');

app.listen(PORT, () => {
  logger.info('='.repeat(60));
  logger.info('🏥 HealthFlow Pharmacy Service Started');
  logger.info('='.repeat(60));
  logger.info(`Port: ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health Check: http://localhost:${PORT}/health`);
  logger.info('='.repeat(60));
});

export default app;

// ------------------------------------------------------------------------------