/**
 * Medicine Service Express App
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { medicineController } from './controllers/medicineController';
import { logger } from './utils/logger';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const { checkDatabaseConnection } = await import('./config/database');
    const dbHealthy = await checkDatabaseConnection();

    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'healthy' : 'unhealthy',
      service: 'medicine-service',
      version: '1.0.0',
      database: dbHealthy ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'medicine-service',
      error: 'Health check failed'
    });
  }
});

// API Routes
const router = express.Router();

router.get('/medicines', medicineController.searchMedicines.bind(medicineController));
router.get('/medicines/:id', medicineController.getMedicine.bind(medicineController));
router.post('/medicines/check-interactions', medicineController.checkInteractions.bind(medicineController));
router.get('/medicines/categories', medicineController.getCategories.bind(medicineController));

app.use('/api/v1', router);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

export default app;