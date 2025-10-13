import express from 'express';
import { monitoringController } from './controllers/monitoringController';
import { logger } from './utils/logger';

const app = express();
app.use(express.json());

app.get('/metrics', monitoringController.getMetrics);
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

const PORT = process.env.PORT || 9090;
app.listen(PORT, () => logger.info(`Monitoring Service on port ${PORT}`));
