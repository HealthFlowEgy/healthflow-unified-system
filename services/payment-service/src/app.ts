import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import paymentRoutes from './routes/paymentRoutes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/payments', paymentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'payment' });
});

export default app;
