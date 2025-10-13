import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'doctor-service' });
});

app.get('/api/doctors', (req, res) => {
  res.json({ success: true, data: [], message: 'Doctor list endpoint' });
});

app.post('/api/doctors', (req, res) => {
  res.status(201).json({ success: true, message: 'Doctor created' });
});

export default app;
