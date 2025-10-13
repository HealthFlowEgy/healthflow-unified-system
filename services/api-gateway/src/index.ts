import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { authenticateRequest } from './middleware/auth';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { MetricsService } from './services/metrics';
import { HealthCheckService } from './services/healthCheck';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8000;

// Initialize services
const metricsService = new MetricsService();
const healthCheckService = new HealthCheckService();

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

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    });
  }
});

app.use('/api/', limiter);

// Request logging
app.use(requestLogger(metricsService));

// Health check endpoint (no auth required)
app.get('/health', async (req, res) => {
  try {
    const health = await healthCheckService.checkAll();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

// Metrics endpoint (no auth required)
app.get('/metrics', (req, res) => {
  const metrics = metricsService.getMetrics();
  res.json(metrics);
});

// Authentication middleware for API routes
app.use('/api/', authenticateRequest);

// Service routing configuration
const serviceRoutes = {
  // Auth Service (from Repo 1) - Unified authentication for all services
  auth: {
    target: process.env.AUTH_SERVICE_URL || 'http://auth-service:4003',
    pathPrefix: '/api/auth',
    pathRewrite: { '^/api/auth': '/api/auth' },
    publicPaths: ['/register', '/login', '/refresh', '/verify-token', '/logout', '/info']
  },
  // AI Validation Service (from Repo 1) - OCR and prescription validation
  validation: {
    target: process.env.AI_VALIDATION_SERVICE_URL || 'http://ai-validation-service:5000',
    pathPrefix: '/api/validation',
    pathRewrite: { '^/api/validation': '/api/validation' }
  },
  // Pharmacy Service (from Repo 3) - Pharmacy operations
  pharmacy: {
    target: process.env.PHARMACY_SERVICE_URL || 'http://pharmacy-service:4001',
    pathPrefix: '/api/pharmacy',
    pathRewrite: { '^/api/pharmacy': '/api/pharmacy' }
  },
  // Legacy routes for backward compatibility
  authV2: {
    target: process.env.AUTH_SERVICE_URL || 'http://auth-service:4003',
    pathPrefix: '/api/v2/auth',
    pathRewrite: { '^/api/v2/auth': '/api/auth' },
    publicPaths: ['/register', '/login', '/refresh', '/verify-token']
  },
  pharmacyV2: {
    target: process.env.PHARMACY_SERVICE_URL || 'http://pharmacy-service:4001',
    pathPrefix: '/api/v2/pharmacy',
    pathRewrite: { '^/api/v2/pharmacy': '/api/pharmacy' }
  }
};

// Create proxy middlewares
Object.entries(serviceRoutes).forEach(([serviceName, config]) => {
  app.use(
    config.pathPrefix,
    createProxyMiddleware({
      target: config.target,
      changeOrigin: true,
      pathRewrite: config.pathRewrite,
      logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      
      onProxyReq: (proxyReq, req: any) => {
        // Add user information to headers
        if (req.user) {
          proxyReq.setHeader('X-User-Id', req.user.userId);
          proxyReq.setHeader('X-User-Email', req.user.email);
          proxyReq.setHeader('X-User-Role', req.user.role);
          if (req.user.tenantId) {
            proxyReq.setHeader('X-Tenant-Id', req.user.tenantId);
          }
        }
        
        // Add request ID for tracing
        const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        proxyReq.setHeader('X-Request-Id', requestId);
        
        logger.debug('Proxying request', {
          service: serviceName,
          path: req.path,
          method: req.method,
          requestId
        });
      },
      
      onError: (err, req, res) => {
        logger.error('Proxy error', {
          service: serviceName,
          error: err.message,
          path: req.url,
          method: req.method
        });
        
        metricsService.recordError(serviceName);
        
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: `${serviceName} service is temporarily unavailable`,
            service: serviceName
          }
        });
      },
      
      onProxyRes: (proxyRes, req) => {
        logger.debug('Proxy response', {
          service: serviceName,
          path: req.url,
          statusCode: proxyRes.statusCode
        });
        
        metricsService.recordRequest({
          service: serviceName,
          method: req.method,
          statusCode: proxyRes.statusCode,
          duration: Date.now() - (req as any).startTime
        });
      }
    })
  );
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  });
});

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`API Gateway started on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    port: PORT
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;

