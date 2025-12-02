import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0');

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet for security headers
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

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration - strict whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
}));

// =============================================================================
// RATE LIMITING
// =============================================================================

// Global rate limiter
const globalLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - Known typing issue with rate-limit-redis
    client: redis,
    prefix: 'rl:global:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per IP
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Authentication endpoints rate limiter (stricter)
const authLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - Known typing issue
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 auth attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes'
  }
});

// Expensive operations rate limiter
const expensiveLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - Known typing issue
    client: redis,
    prefix: 'rl:expensive:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 expensive operations per hour
  message: {
    error: 'Operation quota exceeded',
    retryAfter: '1 hour'
  }
});

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid authentication token'
    });
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || 'dev-secret-key') as any;

    // Check if token is blacklisted
    const isBlacklisted = await redis.exists(`blacklist:${decoded.jti || token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Token revoked',
        message: 'This token has been revoked'
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.sub || decoded.user_id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
    }

    console.error('JWT verification error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

// Optional authentication (for public endpoints that work with or without auth)
const optionalAuth = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without authentication
  }

  // If auth header exists, validate it
  return authenticateJWT(req, res, next);
};

// =============================================================================
// REQUEST LOGGING & MONITORING
// =============================================================================

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId as string;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  });

  next();
});

// =============================================================================
// HEALTH CHECK & METRICS
// =============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/metrics', authenticateJWT, async (req, res) => {
  try {
    const [globalCount, authCount] = await Promise.all([
      redis.get('rl:global:count'),
      redis.get('rl:auth:count')
    ]);

    res.json({
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      rateLimit: {
        global: globalCount || 0,
        auth: authCount || 0
      },
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// =============================================================================
// SERVICE ROUTING WITH SECURITY
// =============================================================================

const services = {
  auth: {
    target: process.env.AUTH_SERVICE_URL || 'http://auth-service:4003',
    pathPrefix: '/api/auth',
    requireAuth: false, // Auth service handles its own authentication
    rateLimit: authLimiter
  },
  validation: {
    target: process.env.AI_VALIDATION_SERVICE_URL || 'http://ai-validation-service:5000',
    pathPrefix: '/api/validation',
    requireAuth: true,
    rateLimit: expensiveLimiter
  },
  pharmacy: {
    target: process.env.PHARMACY_SERVICE_URL || 'http://pharmacy-service:4001',
    pathPrefix: '/api/pharmacy',
    requireAuth: true,
    rateLimit: globalLimiter
  },
  prescription: {
    target: process.env.PRESCRIPTION_SERVICE_URL || 'http://prescription-service:4002',
    pathPrefix: '/api/prescription',
    requireAuth: true,
    rateLimit: globalLimiter
  },
  medicine: {
    target: process.env.MEDICINE_SERVICE_URL || 'http://medicine-service:4004',
    pathPrefix: '/api/medicine',
    requireAuth: false, // Public medication database
    rateLimit: globalLimiter
  },
  regulatory: {
    target: process.env.REGULATORY_SERVICE_URL || 'http://regulatory-service:4005',
    pathPrefix: '/api/regulatory',
    requireAuth: true,
    rateLimit: globalLimiter
  },
  patient: {
    target: process.env.PATIENT_SERVICE_URL || 'http://patient-service:4006',
    pathPrefix: '/api/patients',
    requireAuth: true,
    rateLimit: globalLimiter
  },
  doctor: {
    target: process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:4007',
    pathPrefix: '/api/doctors',
    requireAuth: true,
    rateLimit: globalLimiter
  },
  appointment: {
    target: process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:4008',
    pathPrefix: '/api/appointments',
    requireAuth: true,
    rateLimit: globalLimiter
  },
  notification: {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4009',
    pathPrefix: '/api/notifications',
    requireAuth: true,
    rateLimit: globalLimiter
  },
  file: {
    target: 'http://file-service:4010',
    pathPrefix: '/api/files',
    requireAuth: true,
    rateLimit: expensiveLimiter
  },
  user: {
    target: 'http://user-management-service:4011',
    pathPrefix: '/api/users',
    requireAuth: true,
    rateLimit: globalLimiter
  },
  dashboard: {
    target: 'http://bi-dashboard-service:4012',
    pathPrefix: '/api/dashboards',
    requireAuth: true,
    rateLimit: globalLimiter
  },
  mobile: {
    target: 'http://mobile-api-service:4013',
    pathPrefix: '/api/mobile',
    requireAuth: true,
    rateLimit: globalLimiter
  },
  websocket: {
    target: 'http://websocket-service:4014',
    pathPrefix: '/ws',
    requireAuth: true,
    rateLimit: globalLimiter
  },
  payment: {
    target: 'http://payment-service:4015',
    pathPrefix: '/api/payments',
    requireAuth: true,
    rateLimit: expensiveLimiter
  },
  search: {
    target: 'http://search-service:4016',
    pathPrefix: '/api/search',
    requireAuth: false, // Public search
    rateLimit: globalLimiter
  }
};

// Setup proxies with security
Object.entries(services).forEach(([name, config]) => {
  const middlewares: any[] = [];

  // Add rate limiter
  if (config.rateLimit) {
    middlewares.push(config.rateLimit);
  }

  // Add authentication if required
  if (config.requireAuth) {
    middlewares.push(authenticateJWT);
  } else {
    middlewares.push(optionalAuth);
  }

  // Add proxy middleware
  middlewares.push(
    createProxyMiddleware({
      target: config.target,
      changeOrigin: true,
      pathRewrite: {
        [`^${config.pathPrefix}`]: config.pathPrefix
      },
      onError: (err, req, res) => {
        console.error(`Proxy error for ${name}:`, err);
        res.status(503).json({
          error: 'Service unavailable',
          message: `The ${name} service is temporarily unavailable`,
          service: name
        });
      },
      onProxyReq: (proxyReq, req: AuthenticatedRequest) => {
        // Forward user information to backend services
        if (req.user) {
          proxyReq.setHeader('X-User-ID', req.user.id);
          proxyReq.setHeader('X-User-Email', req.user.email);
          proxyReq.setHeader('X-User-Role', req.user.role);
          proxyReq.setHeader('X-User-Permissions', JSON.stringify(req.user.permissions));
        }
      },
      timeout: 30000 // 30 second timeout
    })
  );

  app.use(config.pathPrefix, ...middlewares);
  console.log(`✅ Configured ${config.pathPrefix} -> ${config.target} (Auth: ${config.requireAuth})`);
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist',
    path: req.path
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS error',
      message: 'Origin not allowed'
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId: req.headers['x-request-id']
  });
});

// =============================================================================
// START SERVER
// =============================================================================

const server = app.listen(PORT, () => {
  console.log(`🚀 Secure API Gateway running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Security features enabled:`);
  console.log(`   - Helmet security headers`);
  console.log(`   - JWT authentication`);
  console.log(`   - Rate limiting (Redis-backed)`);
  console.log(`   - CORS whitelist`);
  console.log(`   - Request logging`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    redis.disconnect();
    process.exit(0);
  });
});

export default app;
