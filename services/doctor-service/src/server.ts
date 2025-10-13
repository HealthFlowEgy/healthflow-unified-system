import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4007;

app.listen(PORT, () => {
  logger.info(`Doctor Service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});
