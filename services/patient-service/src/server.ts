import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4006;

app.listen(PORT, () => {
  logger.info(`Patient Service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});
