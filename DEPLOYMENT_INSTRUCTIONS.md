# HealthFlow Unified System - Deployment Instructions

**Date:** October 23, 2025  
**Status:** Ready for Deployment  
**Version:** 1.0

---

## Overview

This document provides step-by-step instructions for deploying the HealthFlow Unified System. All deployment issues have been resolved, and the system is now ready for installation.

---

## Prerequisites

Before starting the deployment, ensure you have:

- **Docker** version 20.10 or higher
- **Docker Compose** version 2.0 or higher
- At least **8GB RAM** available
- At least **20GB disk space** available
- Ports **3000-3004, 4001-4009, 5000, 5432, 6379, 8000** available

---

## Quick Start

### Step 1: Clone the Repository

```bash
git clone https://github.com/HealthFlowEgy/healthflow-unified-system.git
cd healthflow-unified-system
```

### Step 2: Verify Configuration Files

The following files have been created and are ready to use:

- ✅ `.env` - Environment variables with secure, randomly generated keys
- ✅ `shared/database/init.sql` - Database initialization script

**No additional configuration is required for a basic deployment.**

### Step 3: Deploy the System

```bash
# Build and start all services
docker-compose up --build -d
```

This command will:
1. Build Docker images for all services
2. Create and start containers
3. Initialize the PostgreSQL database
4. Run database migrations
5. Start all frontend portals and backend services

### Step 4: Monitor the Deployment

```bash
# Check container status
docker-compose ps

# Watch logs in real-time
docker-compose logs -f

# Check specific service logs
docker-compose logs -f auth-service
docker-compose logs -f api-gateway
```

### Step 5: Verify the Deployment

Once all containers are running (this may take 2-3 minutes), verify the deployment:

```bash
# Check API Gateway health
curl http://localhost:8000/health

# Check Auth Service health
curl http://localhost:4003/health

# Check AI Validation Service health
curl http://localhost:5000/health

# Check Pharmacy Service health
curl http://localhost:4001/health
```

### Step 6: Access the Portals

Open your web browser and navigate to:

- **AI Validation Portal**: http://localhost:3001
- **Pharmacy Portal**: http://localhost:3002
- **Doctor Portal**: http://localhost:3000
- **Regulatory Portal**: http://localhost:3004

---

## System Architecture

The deployed system consists of:

### Backend Services

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| API Gateway | 8000 | Node.js | Request routing, authentication |
| Auth Service | 4003 | Python/Flask | User authentication, JWT tokens |
| AI Validation Service | 5000 | Python/Flask | Prescription OCR and validation |
| Pharmacy Service | 4001 | Node.js | Inventory management |
| Prescription Service | 4002 | Node.js | Prescription management |
| Medicine Service | 4004 | Node.js | Medicine database |
| Regulatory Service | 4005 | Node.js | Compliance monitoring |
| Patient Service | 4006 | Node.js | Patient records |
| Doctor Service | 4007 | Node.js | Doctor management |
| Appointment Service | 4008 | Node.js | Appointment scheduling |
| Notification Service | 4009 | Node.js | Email/SMS notifications |

### Frontend Portals

| Portal | Port | Users |
|--------|------|-------|
| AI Validation Portal | 3001 | Pharmacists (prescription review) |
| Pharmacy Portal | 3002 | Pharmacists (inventory) |
| Doctor Portal | 3000 | Doctors |
| Regulatory Portal | 3004 | EDA Officers |

### Infrastructure

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching and sessions |

---

## Configuration Details

### Environment Variables

The `.env` file contains all required configuration. Key variables:

**Security (Pre-configured with secure random values):**
- `JWT_SECRET_KEY` - JWT token signing
- `SECRET_KEY` - Flask session encryption
- `POSTGRES_PASSWORD` - Database password

**Service URLs (Pre-configured for Docker Compose):**
- All service URLs are configured for internal Docker networking
- No changes needed for standard deployment

**Optional Services (Not configured by default):**
- Email notifications (SMTP)
- SMS notifications (Twilio)
- Payment processing (Stripe, PayPal)
- Error tracking (Sentry)
- AI features (OpenAI)

To enable optional services, edit the `.env` file and add the appropriate API keys.

### Database Configuration

The PostgreSQL database is automatically initialized with:
- Database name: `healthflow`
- User: `healthflow`
- Password: Randomly generated (see `.env` file)
- Extensions: uuid-ossp, pg_trgm, pgcrypto

Database schema is managed by TypeScript migrations in `shared/database/migrations/` and will be applied automatically when services start.

---

## Troubleshooting

### Issue: Containers fail to start

**Solution:**
```bash
# Check logs for errors
docker-compose logs

# Restart specific service
docker-compose restart [service-name]

# Rebuild and restart
docker-compose up --build -d
```

### Issue: Port conflicts

**Solution:**
```bash
# Check which ports are in use
sudo netstat -tulpn | grep LISTEN

# Stop conflicting services or change ports in docker-compose.yml
```

### Issue: Database connection errors

**Solution:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Issue: Services can't connect to each other

**Solution:**
```bash
# Verify all services are on the same network
docker network inspect healthflow-network

# Restart all services
docker-compose down
docker-compose up -d
```

---

## Stopping the System

```bash
# Stop all services (keeps data)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down

# Stop and remove everything including data
docker-compose down -v
```

---

## Production Deployment Considerations

For production deployment, you should:

1. **Change Environment to Production**
   ```bash
   NODE_ENV=production
   FLASK_ENV=production
   ```

2. **Use Managed Database Service**
   - AWS RDS, Azure Database for PostgreSQL, or Google Cloud SQL
   - Update `DATABASE_URL` in `.env`

3. **Enable SSL/TLS**
   - Configure reverse proxy (Nginx, Traefik)
   - Obtain SSL certificates (Let's Encrypt)

4. **Set Up Monitoring**
   - Configure Sentry for error tracking
   - Set up Prometheus and Grafana for metrics
   - Enable health check endpoints

5. **Implement Backups**
   - Configure automated database backups
   - Set up disaster recovery procedures

6. **Security Hardening**
   - Use secrets management (AWS Secrets Manager, HashiCorp Vault)
   - Enable rate limiting
   - Configure firewall rules
   - Perform security audit

7. **Use Specific Image Versions**
   - Replace `:latest` tags with specific versions in docker-compose.yml

---

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review this documentation
- Contact: dev@healthflow.egypt.gov

---

**Deployment Status:** ✅ Ready  
**Last Updated:** October 23, 2025

