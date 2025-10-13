import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import organizationRoutes from './routes/organizationRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-management-service' });
});

app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/organizations', organizationRoutes);

export default app;
