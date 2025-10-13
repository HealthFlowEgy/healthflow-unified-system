import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4010;

app.listen(PORT, () => {
  logger.info(`File Service running on port ${PORT}`);
});
