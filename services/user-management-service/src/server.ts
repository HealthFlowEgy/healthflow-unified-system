import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4011;

app.listen(PORT, () => {
  logger.info(`User Management Service running on port ${PORT}`);
});
