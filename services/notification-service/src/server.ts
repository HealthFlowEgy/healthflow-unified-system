import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4009;

app.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  process.exit(0);
});
