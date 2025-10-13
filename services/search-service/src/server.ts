import express from 'express';
import cors from 'cors';
import { searchController } from './controllers/searchController';
import { logger } from './utils/logger';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/search', searchController.search);
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

const PORT = process.env.PORT || 4016;
app.listen(PORT, () => logger.info(`Search Service on port ${PORT}`));
