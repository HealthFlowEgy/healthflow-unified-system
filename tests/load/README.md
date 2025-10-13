# Load Testing

This directory contains load testing configurations and scripts for the HealthFlow system.

## Tools

### Artillery
- **Config:** `artillery-config.yml`
- **Processor:** `load-test-processor.js`

**Run:**
```bash
npm install -g artillery
artillery run artillery-config.yml
```

### K6
- **Script:** `k6-script.js`

**Run:**
```bash
k6 run k6-script.js
```

## Test Scenarios

1. **Patient Portal Flow** (40% weight)
   - Login
   - View patient details
   - View prescriptions
   - View appointments

2. **Doctor Portal Flow** (30% weight)
   - Login
   - View dashboard
   - View patients
   - Create prescription

3. **Appointment Booking** (20% weight)
   - Login
   - Search doctors
   - Book appointment

4. **Payment Processing** (10% weight)
   - Login
   - Create payment

## Performance Targets

- **Error Rate:** < 1%
- **P95 Response Time:** < 500ms
- **P99 Response Time:** < 1000ms
- **Concurrent Users:** 100+

## Monitoring

Run performance monitoring during tests:
```bash
./performance-monitor.sh
```

## Results

Results are saved in `logs/performance/`
