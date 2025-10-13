#!/bin/bash

echo "=== Setting up Sprint 3 Services ==="

# Patient Service package.json
cat > services/patient-service/package.json << 'EOF'
{
  "name": "healthflow-patient-service",
  "version": "1.0.0",
  "description": "HealthFlow Patient Management Service",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "drizzle-orm": "^0.29.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.2"
  }
}
EOF

# Doctor Service package.json
cat > services/doctor-service/package.json << 'EOF'
{
  "name": "healthflow-doctor-service",
  "version": "1.0.0",
  "description": "HealthFlow Doctor Management Service",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "drizzle-orm": "^0.29.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.2"
  }
}
EOF

# Patient Service app
cat > services/patient-service/src/app.ts << 'EOF'
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
EOF

# Patient Service server
cat > services/patient-service/src/server.ts << 'EOF'
import app from './app';

const PORT = process.env.PORT || 4006;

app.listen(PORT, () => {
  console.log(`Patient Service running on port ${PORT}`);
});
EOF

# Doctor Service app
cat > services/doctor-service/src/app.ts << 'EOF'
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
EOF

# Doctor Service server
cat > services/doctor-service/src/server.ts << 'EOF'
import app from './app';

const PORT = process.env.PORT || 4007;

app.listen(PORT, () => {
  console.log(`Doctor Service running on port ${PORT}`);
});
EOF

# TypeScript configs
cat > services/patient-service/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
EOF

cp services/patient-service/tsconfig.json services/doctor-service/tsconfig.json

# Dockerfiles
cat > services/patient-service/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4006
CMD ["npm", "start"]
EOF

cat > services/doctor-service/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4007
CMD ["npm", "start"]
EOF

echo "✅ Sprint 3 services configured"
