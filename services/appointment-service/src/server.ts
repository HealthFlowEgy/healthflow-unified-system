/**
 * Appointment Service Server
 */

import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4008;

app.listen(PORT, () => {
  logger.info(`Appointment Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

