import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mobileRoutes from './routes/mobileRoutes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

app.use('/api/mobile', mobileRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mobile-api' });
});

export default app;
