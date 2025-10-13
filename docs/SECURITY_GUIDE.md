# HealthFlow Security Guide

## Overview

This document outlines security best practices, policies, and procedures for the HealthFlow Digital Prescription Portal System.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Data Protection](#data-protection)
3. [API Security](#api-security)
4. [Infrastructure Security](#infrastructure-security)
5. [Compliance](#compliance)
6. [Incident Response](#incident-response)
7. [Security Auditing](#security-auditing)

## Authentication & Authorization

### Password Policy

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)
- Cannot contain common words or patterns
- Must be changed every 90 days
- Cannot reuse last 5 passwords

**Implementation:**
```typescript
import { validators } from '@healthflow/utils';

const result = validators.password(password);
if (!result.valid) {
  throw new Error(result.errors.join(', '));
}
```

### Multi-Factor Authentication (MFA)

**Supported Methods:**
- SMS OTP
- Email OTP
- Authenticator App (TOTP)
- Biometric (for mobile apps)

**Configuration:**
```typescript
// Enable MFA for user
await userService.enableMFA(userId, {
  method: 'totp',
  secret: totpSecret
});

// Verify MFA code
const isValid = await authService.verifyMFA(userId, code);
```

### Session Management

**Settings:**
- Session timeout: 30 minutes of inactivity
- Maximum session duration: 12 hours
- Concurrent sessions: 3 per user
- Session tokens: JWT with RS256 signing

**Implementation:**
```typescript
// Create session
const session = await sessionService.create({
  userId,
  ipAddress,
  userAgent,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000)
});

// Validate session
const isValid = await sessionService.validate(sessionToken);

// Revoke session
await sessionService.revoke(sessionId);
```

### Role-Based Access Control (RBAC)

**Roles:**
- **Super Admin**: Full system access
- **Admin**: User and system management
- **Doctor**: Patient care and prescriptions
- **Pharmacist**: Prescription dispensing
- **Patient**: Personal health records
- **Auditor**: Read-only access for compliance

**Permissions:**
```typescript
const permissions = {
  users: ['create', 'read', 'update', 'delete'],
  patients: ['create', 'read', 'update', 'delete'],
  prescriptions: ['create', 'read', 'update', 'dispense'],
  reports: ['read', 'export']
};

// Check permission
const hasPermission = await authService.checkPermission(
  userId,
  'prescriptions',
  'create'
);
```

## Data Protection

### Encryption

**At Rest:**
- Database: AES-256 encryption
- File storage: S3 server-side encryption (SSE-S3)
- Backups: Encrypted with AES-256

**In Transit:**
- TLS 1.3 for all API communications
- Certificate pinning for mobile apps
- HSTS enabled

**Sensitive Fields:**
```typescript
// Encrypt sensitive data
const encrypted = await crypto.encrypt(sensitiveData, encryptionKey);

// Decrypt sensitive data
const decrypted = await crypto.decrypt(encrypted, encryptionKey);
```

### Data Masking

**Implementation:**
```typescript
import { maskEmail, maskPhone, maskCreditCard } from '@healthflow/utils';

// Mask email
const maskedEmail = maskEmail('john.doe@example.com');
// Output: j****e@example.com

// Mask phone
const maskedPhone = maskPhone('+201234567890');
// Output: ********7890

// Mask credit card
const maskedCard = maskCreditCard('4111111111111111');
// Output: ************1111
```

### Data Retention

**Policies:**
- Patient records: 10 years after last visit
- Prescriptions: 5 years
- Audit logs: 7 years
- Session logs: 90 days
- Backup data: 30 days

**Implementation:**
```typescript
// Schedule data cleanup
await dataRetentionService.scheduleCleanup({
  type: 'session_logs',
  retentionDays: 90
});
```

## API Security

### Rate Limiting

**Limits:**
- Authentication endpoints: 5 requests per minute
- API endpoints: 100 requests per minute
- File uploads: 10 requests per hour

**Implementation:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

### Input Validation

**All inputs must be validated:**
```typescript
import { validators, sanitizers } from '@healthflow/utils';

// Validate and sanitize email
const email = sanitizers.email(req.body.email);
if (!validators.email(email)) {
  throw new ValidationError('Invalid email address');
}

// Validate phone number
if (!validators.egyptianPhone(req.body.phone)) {
  throw new ValidationError('Invalid phone number');
}
```

### SQL Injection Prevention

**Use parameterized queries:**
```typescript
// ✅ GOOD - Parameterized query
const users = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, email));

// ❌ BAD - String concatenation
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

### XSS Prevention

**Sanitize all user input:**
```typescript
import { sanitizers } from '@healthflow/utils';

// Sanitize string input
const cleanInput = sanitizers.string(userInput);

// Use Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:']
  }
}));
```

### CSRF Protection

**Implementation:**
```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.post('/api/sensitive-action', csrfProtection, (req, res) => {
  // Protected endpoint
});
```

## Infrastructure Security

### Network Security

**Firewall Rules:**
- Allow inbound: 80 (HTTP), 443 (HTTPS), 22 (SSH from specific IPs)
- Deny all other inbound traffic
- Allow outbound: 80, 443, 25 (SMTP), 587 (SMTP TLS)

**Configuration:**
```bash
# UFW firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from 10.0.0.0/8 to any port 22
sudo ufw enable
```

### Database Security

**Configuration:**
```sql
-- Create read-only user for reporting
CREATE USER healthflow_readonly WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE healthflow TO healthflow_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO healthflow_readonly;

-- Enable SSL connections
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/path/to/server.crt';
ALTER SYSTEM SET ssl_key_file = '/path/to/server.key';
```

### Container Security

**Best Practices:**
- Run containers as non-root user
- Use minimal base images
- Scan images for vulnerabilities
- Limit container resources

**Dockerfile:**
```dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy files
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Run application
CMD ["node", "dist/server.js"]
```

### Secrets Management

**Use environment variables:**
```bash
# Never commit secrets to git
# Use .env files (add to .gitignore)

DATABASE_URL=postgresql://user:password@localhost:5432/healthflow
JWT_SECRET=your-super-secret-key
SENDGRID_API_KEY=SG.xxx
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Use secret management services:**
```typescript
// AWS Secrets Manager
import { SecretsManager } from 'aws-sdk';

const secretsManager = new SecretsManager();
const secret = await secretsManager.getSecretValue({
  SecretId: 'healthflow/production/database'
}).promise();
```

## Compliance

### HIPAA Compliance

**Requirements:**
- ✅ Access controls (RBAC)
- ✅ Audit logging
- ✅ Data encryption (at rest and in transit)
- ✅ Backup and disaster recovery
- ✅ Automatic logoff (30 minutes)
- ✅ Emergency access procedures

### GDPR Compliance

**Requirements:**
- ✅ Right to access (data export)
- ✅ Right to erasure (data deletion)
- ✅ Data portability
- ✅ Consent management
- ✅ Breach notification (within 72 hours)

**Implementation:**
```typescript
// Export user data
const userData = await gdprService.exportUserData(userId);

// Delete user data
await gdprService.deleteUserData(userId);

// Record consent
await consentService.recordConsent(userId, {
  type: 'data_processing',
  granted: true,
  timestamp: new Date()
});
```

### Egyptian Data Protection Law

**Requirements:**
- Data must be stored in Egypt or approved jurisdictions
- User consent required for data collection
- Data breach notification to authorities
- Appointment of Data Protection Officer (DPO)

## Incident Response

### Incident Classification

**Severity Levels:**
- **Critical**: Data breach, system compromise
- **High**: Service outage, unauthorized access attempt
- **Medium**: Performance degradation, minor security issue
- **Low**: Informational, false positive

### Response Procedures

**1. Detection and Analysis**
```bash
# Check logs for suspicious activity
tail -f /var/log/healthflow/security.log

# Check failed login attempts
psql -U healthflow -d healthflow -c "
  SELECT user_id, ip_address, COUNT(*) as attempts
  FROM login_attempts
  WHERE success = false AND created_at > NOW() - INTERVAL '1 hour'
  GROUP BY user_id, ip_address
  HAVING COUNT(*) > 5;
"
```

**2. Containment**
```bash
# Block suspicious IP
sudo ufw deny from 192.168.1.100

# Revoke user sessions
psql -U healthflow -d healthflow -c "
  UPDATE sessions SET revoked = true WHERE user_id = 'suspicious_user_id';
"
```

**3. Eradication**
```bash
# Remove malicious files
find /var/www -name "*.php" -type f -delete

# Update vulnerable packages
npm audit fix
```

**4. Recovery**
```bash
# Restore from backup
gunzip < /backups/healthflow/healthflow_20251013.sql.gz | psql -U healthflow healthflow

# Restart services
docker-compose restart
```

**5. Post-Incident**
- Document incident details
- Update security measures
- Notify affected users
- Report to authorities (if required)

## Security Auditing

### Audit Logging

**Events to Log:**
- Authentication attempts (success and failure)
- Authorization failures
- Data access (read, create, update, delete)
- Configuration changes
- Administrative actions
- System errors

**Implementation:**
```typescript
// Log security event
await auditService.log({
  userId,
  action: 'prescription.create',
  resource: prescriptionId,
  ipAddress,
  userAgent,
  success: true,
  metadata: { patientId, doctorId }
});
```

### Security Monitoring

**Tools:**
- **SIEM**: Splunk or ELK Stack
- **IDS/IPS**: Snort or Suricata
- **Vulnerability Scanning**: Nessus or OpenVAS
- **Log Analysis**: Graylog

**Alerts:**
```typescript
// Configure alerts
await alertService.configure({
  name: 'Multiple Failed Logins',
  condition: 'failed_login_count > 5 in 5 minutes',
  action: 'email',
  recipients: ['security@healthflow.eg']
});
```

### Penetration Testing

**Schedule:**
- External penetration test: Annually
- Internal penetration test: Semi-annually
- Vulnerability assessment: Quarterly
- Code review: Every release

### Security Checklist

**Pre-Deployment:**
- [ ] All dependencies updated
- [ ] Security scan completed
- [ ] Secrets removed from code
- [ ] SSL/TLS configured
- [ ] Firewall rules applied
- [ ] Backup tested
- [ ] Monitoring configured
- [ ] Incident response plan reviewed

**Post-Deployment:**
- [ ] Access logs reviewed
- [ ] Error rates monitored
- [ ] Performance metrics checked
- [ ] Security alerts configured
- [ ] Team notified

## Security Contacts

**Security Team:**
- Email: security@healthflow.eg
- Phone: +20 2 1234 5678
- On-call: +20 100 123 4567

**Incident Reporting:**
- Email: incidents@healthflow.eg
- Portal: https://security.healthflow.eg/report

**Vulnerability Disclosure:**
- Email: vuln@healthflow.eg
- PGP Key: https://healthflow.eg/pgp-key.txt

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/)
- [GDPR](https://gdpr.eu/)

---

**Last Updated:** October 13, 2025  
**Version:** 1.0.0  
**Owner:** Security Team
