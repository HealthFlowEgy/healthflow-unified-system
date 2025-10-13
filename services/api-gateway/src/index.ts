import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway' });
});

// Service routing
const services = {
  auth: {
    target: process.env.AUTH_SERVICE_URL || 'http://auth-service:4003',
    pathPrefix: '/api/auth',
  },
  validation: {
    target: process.env.AI_VALIDATION_SERVICE_URL || 'http://ai-validation-service:5000',
    pathPrefix: '/api/validation',
  },
  pharmacy: {
    target: process.env.PHARMACY_SERVICE_URL || 'http://pharmacy-service:4001',
    pathPrefix: '/api/pharmacy',
  },
  prescription: {
    target: process.env.PRESCRIPTION_SERVICE_URL || 'http://prescription-service:4002',
    pathPrefix: '/api/prescription',
  },
  medicine: {
    target: process.env.MEDICINE_SERVICE_URL || 'http://medicine-service:4004',
    pathPrefix: '/api/medicine',
  },
  regulatory: {
    target: process.env.REGULATORY_SERVICE_URL || 'http://regulatory-service:4005',
    pathPrefix: '/api/regulatory',
  },
  patient: {
    target: process.env.PATIENT_SERVICE_URL || 'http://patient-service:4006',
    pathPrefix: '/api/patients',
  },
  doctor: {
    target: process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:4007',
    pathPrefix: '/api/doctors',
  },
  appointment: {
    target: process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:4008',
    pathPrefix: '/api/appointments',
  },
  notification: {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4009',
    pathPrefix: '/api/notifications',
  },
};

// Setup proxies
Object.entries(services).forEach(([name, config]) => {
  app.use(
    config.pathPrefix,
    createProxyMiddleware({
      target: config.target,
      changeOrigin: true,
      pathRewrite: {
        [`^${config.pathPrefix}`]: config.pathPrefix,
      },
    })
  );
  console.log(`✅ Proxying ${config.pathPrefix} -> ${config.target}`);
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});

// Sprint 5 Services
app.use('/api/files', createProxyMiddleware({
  target: 'http://file-service:4010',
  changeOrigin: true,
  pathRewrite: { '^/api/files': '/api/files' }
}));

app.use('/api/users', createProxyMiddleware({
  target: 'http://user-management-service:4011',
  changeOrigin: true,
  pathRewrite: { '^/api/users': '/api/users' }
}));

app.use('/api/roles', createProxyMiddleware({
  target: 'http://user-management-service:4011',
  changeOrigin: true,
  pathRewrite: { '^/api/roles': '/api/roles' }
}));

app.use('/api/organizations', createProxyMiddleware({
  target: 'http://user-management-service:4011',
  changeOrigin: true,
  pathRewrite: { '^/api/organizations': '/api/organizations' }
}));

app.use('/api/dashboards', createProxyMiddleware({
  target: 'http://bi-dashboard-service:4012',
  changeOrigin: true,
  pathRewrite: { '^/api/dashboards': '/api/dashboards' }
}));

app.use('/api/analytics', createProxyMiddleware({
  target: 'http://bi-dashboard-service:4012',
  changeOrigin: true,
  pathRewrite: { '^/api/analytics': '/api/analytics' }
}));
