import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes/dashboardRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bi-dashboard-service' });
});

app.use('/api/dashboards', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);

export default app;
