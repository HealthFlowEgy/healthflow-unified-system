/**
 * Express Application Configuration
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prescriptionController } from './controllers/prescriptionController';
import { logger } from './utils/logger';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const { checkDatabaseConnection } = await import('./config/database');
    const dbHealthy = await checkDatabaseConnection();

    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'healthy' : 'unhealthy',
      service: 'prescription-service',
      version: '1.0.0',
      timestamp: new Date().toISO String(),
      database: dbHealthy ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'prescription-service',
      error: 'Health check failed'
    });
  }
});

// API Routes
const router = express.Router();

// Prescription routes
router.post('/prescriptions', prescriptionController.createPrescription.bind(prescriptionController));
router.get('/prescriptions', prescriptionController.getPrescriptions.bind(prescriptionController));
router.get('/prescriptions/:id', prescriptionController.getPrescription.bind(prescriptionController));
router.post('/prescriptions/:id/submit', prescriptionController.submitForValidation.bind(prescriptionController));
router.put('/prescriptions/:id/status', prescriptionController.updateStatus.bind(prescriptionController));
router.get('/prescriptions/:id/history', prescriptionController.getPrescriptionHistory.bind(prescriptionController));
router.delete('/prescriptions/:id', prescriptionController.deletePrescription.bind(prescriptionController));

app.use('/api/v1', router);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

export default app;