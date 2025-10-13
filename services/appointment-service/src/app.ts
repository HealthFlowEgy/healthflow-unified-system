/**
 * Appointment Service Application
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import appointmentRoutes from './routes/appointmentRoutes';
import { logger } from './utils/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'appointment-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/appointments', appointmentRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

export default app;

