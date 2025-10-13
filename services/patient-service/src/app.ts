import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'patient-service' });
});

app.get('/api/patients', (req, res) => {
  res.json({ success: true, data: [], message: 'Patient list endpoint' });
});

app.post('/api/patients', (req, res) => {
  res.status(201).json({ success: true, message: 'Patient created' });
});

export default app;
