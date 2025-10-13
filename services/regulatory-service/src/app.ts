import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4005;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'regulatory-service', timestamp: new Date().toISOString() });
});

// Stub routes - to be implemented in Sprint 3/4
app.get('/api/regulatory/reports', (req, res) => {
  res.json({ message: 'Regulatory reports endpoint - coming in Sprint 3', data: [] });
});

app.get('/api/regulatory/compliance', (req, res) => {
  res.json({ message: 'Compliance monitoring endpoint - coming in Sprint 3', data: {} });
});

app.listen(PORT, () => {
  console.log(`Regulatory Service running on port ${PORT}`);
});
