# HealthFlow Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Service Deployment](#service-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Production Configuration](#production-configuration)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Backup and Recovery](#backup-and-recovery)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **OS**: Ubuntu 22.04 LTS or later
- **CPU**: 4+ cores
- **RAM**: 16GB minimum, 32GB recommended
- **Storage**: 100GB SSD minimum
- **Network**: Static IP address, open ports 80, 443

### Software Requirements

- Docker 24.0+
- Docker Compose 2.20+
- Node.js 20.x
- PostgreSQL 15.x
- Redis 7.x
- Nginx 1.24+

## Environment Setup

### 1. Install Docker

```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker $USER
```

### 2. Install Node.js

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20
```

### 3. Clone Repository

```bash
git clone https://github.com/HealthFlowEgy/healthflow-unified-system.git
cd healthflow-unified-system
```

### 4. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://healthflow:password@localhost:5432/healthflow
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=24h

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@healthflow.eg

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+201234567890

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=healthflow-files
AWS_REGION=us-east-1

# OAuth2
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Application
NODE_ENV=production
API_URL=https://api.healthflow.eg
FRONTEND_URL=https://healthflow.eg
```

## Database Setup

### 1. Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE healthflow;
CREATE USER healthflow WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE healthflow TO healthflow;
\q
```

### 3. Run Migrations

```bash
# Run all migrations in order
for migration in shared/database/migrations/*.sql; do
    psql -U healthflow -d healthflow -f "$migration"
done
```

### 4. Verify Database

```bash
psql -U healthflow -d healthflow -c "\dt"
```

## Service Deployment

### 1. Build Services

```bash
# Build all services
docker-compose build

# Or build individual services
docker-compose build auth-service
docker-compose build patient-service
docker-compose build doctor-service
```

### 2. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 3. Verify Services

```bash
# Check health endpoints
curl http://localhost:4001/health  # Auth Service
curl http://localhost:4006/health  # Patient Service
curl http://localhost:4007/health  # Doctor Service
curl http://localhost:4008/health  # Appointment Service
curl http://localhost:4009/health  # Notification Service
curl http://localhost:4010/health  # File Service
curl http://localhost:4011/health  # User Management Service
curl http://localhost:4012/health  # BI Dashboard Service
```

## Frontend Deployment

### 1. Build Frontend Applications

```bash
# Doctor Portal
cd portals/doctor-portal
npm install
npm run build

# Patient Portal
cd ../patient-portal
npm install
npm run build

# Admin Portal
cd ../admin-portal
npm install
npm run build
```

### 2. Configure Nginx

```bash
# Install Nginx
sudo apt-get install -y nginx

# Copy Nginx configuration
sudo cp deployment/nginx/healthflow.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/healthflow.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. SSL/TLS Setup

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d healthflow.eg -d www.healthflow.eg -d api.healthflow.eg

# Auto-renewal
sudo certbot renew --dry-run
```

## Production Configuration

### 1. Security Hardening

```bash
# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Disable root SSH login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Configure fail2ban
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Performance Optimization

```bash
# Increase file descriptors
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Configure PostgreSQL
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Add/modify:
```
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
```

### 3. Monitoring Setup

```bash
# Install Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Install Grafana
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

## Monitoring and Logging

### 1. Application Logs

```bash
# View service logs
docker-compose logs -f [service-name]

# Export logs
docker-compose logs > logs/healthflow-$(date +%Y%m%d).log
```

### 2. Database Monitoring

```bash
# Monitor active connections
psql -U healthflow -d healthflow -c "SELECT count(*) FROM pg_stat_activity;"

# Monitor slow queries
psql -U healthflow -d healthflow -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### 3. System Monitoring

```bash
# CPU and Memory
htop

# Disk usage
df -h

# Network
netstat -tulpn
```

## Backup and Recovery

### 1. Database Backup

```bash
# Create backup script
cat > /usr/local/bin/backup-healthflow.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/backups/healthflow"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U healthflow healthflow | gzip > $BACKUP_DIR/healthflow_$DATE.sql.gz

# Backup files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/healthflow/files

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
SCRIPT

chmod +x /usr/local/bin/backup-healthflow.sh

# Schedule daily backups
echo "0 2 * * * /usr/local/bin/backup-healthflow.sh" | crontab -
```

### 2. Database Restore

```bash
# Restore from backup
gunzip < /backups/healthflow/healthflow_20251013.sql.gz | psql -U healthflow healthflow
```

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs
docker-compose logs [service-name]

# Check port conflicts
sudo netstat -tulpn | grep [port]

# Restart service
docker-compose restart [service-name]
```

#### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connectivity
psql -U healthflow -d healthflow -c "SELECT 1;"

# Check connection limits
psql -U postgres -c "SHOW max_connections;"
```

#### High Memory Usage

```bash
# Check Docker container stats
docker stats

# Restart services
docker-compose restart

# Clear Docker cache
docker system prune -a
```

#### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Check certificate expiry
sudo certbot certificates
```

## Support

For deployment support:
- Email: devops@healthflow.eg
- Documentation: https://docs.healthflow.eg
- Status Page: https://status.healthflow.eg

## License

Copyright © 2025 HealthFlow Egypt. All rights reserved.
