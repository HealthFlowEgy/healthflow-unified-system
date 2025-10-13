import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4012;

app.listen(PORT, () => {
  logger.info(`BI Dashboard Service running on port ${PORT}`);
});
