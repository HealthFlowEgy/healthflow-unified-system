import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4015;

app.listen(PORT, () => {
  logger.info(`Payment Service running on port ${PORT}`);
});
