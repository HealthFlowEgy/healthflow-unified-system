import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4013;

app.listen(PORT, () => {
  logger.info(`Mobile API Service running on port ${PORT}`);
});
