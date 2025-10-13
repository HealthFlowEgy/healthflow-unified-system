# 🏥 HealthFlow Unified System

**National Digital Prescription System for Egypt**

This is the unified integration of three HealthFlow repositories into a single, cohesive platform.

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                       │
├──────────────────┬──────────────────┬──────────────────────┤
│ AI Validation    │ Pharmacy Portal  │ Regulatory Portal    │
│ Portal (3001)    │ (3002)           │ (3004)               │
│ - Upload RX      │ - Inventory      │ - EDA Compliance     │
│ - AI Review      │ - Dispensing     │ - Monitoring         │
│ - Approval       │ - Reports        │ - Recalls            │
└──────────────────┴──────────────────┴──────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY (8000)                       │
│  - Request routing                                           │
│  - Authentication middleware                                 │
│  - Rate limiting                                             │
│  - Logging & monitoring                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────┬──────────────────┬──────────────────────┐
│ Auth Service     │ AI Validation    │ Pharmacy Service     │
│ (4003)           │ Service (5000)   │ (4001)               │
│ - JWT Auth       │ - OCR            │ - Inventory Mgmt     │
│ - MFA/TOTP       │ - Clinical Val   │ - Dispensing         │
│ - RBAC           │ - Drug Check     │ - Reports            │
│ - HIPAA Audit    │ - RX Validation  │ - Analytics          │
└──────────────────┴──────────────────┴──────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              DATABASE & CACHE LAYER                          │
├──────────────────────────────┬──────────────────────────────┤
│ PostgreSQL (5432)            │ Redis (6379)                 │
│ - User data                  │ - Sessions                   │
│ - Prescriptions              │ - Rate limiting              │
│ - Inventory                  │ - Caching                    │
│ - Audit logs                 │                              │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 🎯 Components

### Backend Services

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| **API Gateway** | 8000 | Node.js/Express | Single entry point, routing, auth |
| **Auth Service** | 4003 | Python/Flask | Authentication, MFA, RBAC |
| **AI Validation** | 5000 | Python/Flask | OCR, clinical validation, drug checks |
| **Pharmacy Service** | 4001 | Node.js/Express | Inventory, dispensing, reports |

### Frontend Portals

| Portal | Port | Technology | Users |
|--------|------|------------|-------|
| **AI Validation Portal** | 3001 | React + Vite | Pharmacists (review) |
| **Pharmacy Portal** | 3002 | React + Vite | Pharmacists (operations) |
| **Regulatory Portal** | 3004 | React + TypeScript | EDA Officers |

### Mobile Applications

| App | Platform | Technology |
|-----|----------|------------|
| **HealthFlow Mobile** | iOS + Android | React Native |

---

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)
- Python 3.10+ (for local development)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/HealthFlowEgy/healthflow-unified-system.git
cd healthflow-unified-system

# 2. Create environment file
cp .env.example .env

# 3. Edit .env and set your secrets
nano .env

# 4. Start all services
docker-compose up -d

# 5. Check service health
docker-compose ps

# 6. View logs
docker-compose logs -f
```

### Access the System

| Service | URL | Credentials |
|---------|-----|-------------|
| API Gateway | http://localhost:8000 | N/A |
| Auth Service | http://localhost:4003 | N/A |
| AI Validation Portal | http://localhost:3001 | demo/demo123 |
| Pharmacy Portal | http://localhost:3002 | demo/demo123 |
| Regulatory Portal | http://localhost:3004 | demo/demo123 |

---

## 📚 API Documentation

### Authentication Endpoints

```bash
# Login
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

# Response
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "role": "pharmacist"
  }
}

# Verify Token
POST http://localhost:8000/api/auth/verify-token
Authorization: Bearer {access_token}

# Refresh Token
POST http://localhost:8000/api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ..."
}
```

### AI Validation Endpoints

```bash
# Extract text from prescription image
POST http://localhost:8000/api/validation/ocr/extract
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

file: [prescription_image.jpg]

# Validate prescription
POST http://localhost:8000/api/validation/validate/prescription
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "patient_name": "John Doe",
  "medications": [
    {
      "name": "Aspirin",
      "dosage": "100mg",
      "frequency": "once daily"
    }
  ]
}
```

### Pharmacy Endpoints

```bash
# Get inventory
GET http://localhost:8000/api/pharmacy/inventory
Authorization: Bearer {access_token}

# Dispense medication
POST http://localhost:8000/api/pharmacy/dispense
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "prescription_id": "rx-123",
  "pharmacy_id": "ph-456",
  "medications": [...]
}
```

---

## 🛠 Development

### Local Development Setup

```bash
# Install dependencies for all services
npm run install:all

# Start services in development mode
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
healthflow-unified-system/
├── services/
│   ├── api-gateway/          # API Gateway (Node.js)
│   ├── auth-service/         # Auth Service (Python)
│   ├── ai-validation-service/# AI Validation (Python)
│   └── pharmacy-service/     # Pharmacy Service (Node.js)
├── portals/
│   ├── ai-validation-portal/ # AI Validation UI (React)
│   ├── pharmacy-portal/      # Pharmacy UI (React)
│   └── regulatory-portal/    # Regulatory UI (React)
├── mobile/
│   └── healthflow-mobile-app/# Mobile App (React Native)
├── shared/
│   ├── database/             # Database schemas
│   ├── types/                # TypeScript types
│   ├── utils/                # Shared utilities
│   └── config/               # Shared configuration
├── infrastructure/
│   ├── docker/               # Docker configs
│   ├── kubernetes/           # K8s manifests
│   └── terraform/            # Infrastructure as code
├── docs/
│   ├── api/                  # API documentation
│   ├── architecture/         # Architecture docs
│   └── deployment/           # Deployment guides
├── docker-compose.yml        # Docker Compose config
├── .env.example              # Environment template
└── README.md                 # This file
```

---

## 🔒 Security

### Authentication Flow

1. User logs in via any portal
2. Credentials sent to API Gateway
3. API Gateway forwards to Auth Service
4. Auth Service validates and returns JWT
5. Client stores JWT
6. All subsequent requests include JWT
7. API Gateway validates JWT before routing

### Environment Variables

**Required:**
- `JWT_SECRET_KEY` - Secret key for JWT signing
- `POSTGRES_PASSWORD` - Database password
- `SECRET_KEY` - Flask secret key

**Optional:**
- `NODE_ENV` - Node.js environment (development/production)
- `FLASK_ENV` - Flask environment (development/production)
- `ALLOWED_ORIGINS` - CORS allowed origins

---

## 📊 Monitoring

### Health Checks

```bash
# Check all services
curl http://localhost:8000/health
curl http://localhost:4003/health
curl http://localhost:5000/health
curl http://localhost:4001/health
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
docker-compose logs -f ai-validation-service
docker-compose logs -f pharmacy-service
```

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run service-specific tests
cd services/api-gateway && npm test
cd services/pharmacy-service && npm test
cd services/auth-service && python -m pytest
cd services/ai-validation-service && python -m pytest
```

---

## 🚢 Deployment

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale pharmacy-service=3
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/

# Check deployment status
kubectl get pods -n healthflow

# View logs
kubectl logs -f deployment/api-gateway -n healthflow
```

---

## 📝 Integration Details

### Repository Sources

This unified system integrates code from three repositories:

1. **Repository 1: ai-prescription-validation-system**
   - Auth Service (src/auth/)
   - AI Validation Service (src/services/)
   - AI Validation Portal (frontend/)

2. **Repository 2: healthflow-digital-prescription-portals**
   - Regulatory Portal (frontend/regulatory-portal/)

3. **Repository 3: healthflow-integration-platform**
   - API Gateway (api-gateway/)
   - Pharmacy Service (pharmacy-service/)
   - Pharmacy Portal (pharmacy-portal/)
   - Mobile App (mobile-app/)
   - Database schemas (database/)

### Integration Changes

- ✅ Unified authentication using Repo 1 Auth Service
- ✅ All portals route through API Gateway
- ✅ Consistent JWT token validation
- ✅ Shared database schema
- ✅ Centralized logging and monitoring

---

## 📞 Support

For questions or issues:
- **GitHub:** https://github.com/HealthFlowEgy/healthflow-unified-system
- **Documentation:** See `/docs` folder
- **Email:** dev@healthflow.egypt.gov

---

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ by the HealthFlow Development Team**

**Last Updated:** October 12, 2025  
**Version:** 1.0.0

