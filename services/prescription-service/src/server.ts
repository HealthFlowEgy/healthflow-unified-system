/**
 * Server Entry Point
 */

import app from './app';
import { logger } from './utils/logger';
import { checkDatabaseConnection } from './config/database';

const PORT = process.env.PORT || 4002;

async function startServer() {
  try {
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    logger.info('Database connected successfully');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Prescription Service listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();