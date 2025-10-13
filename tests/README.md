# HealthFlow Automated Testing Suite

## Overview
Comprehensive test suite for HealthFlow Sprint 5 services.

## Test Coverage
- User Management Service (5 tests)
- BI Dashboard Service (2 tests)
- File Service (2 tests)

## Running Tests

### Prerequisites
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## Environment Variables
- `API_URL`: Base URL for API (default: http://localhost:8000)

## Test Structure
- `user-management.test.ts`: User CRUD operations
- `bi-dashboard.test.ts`: Analytics and metrics
- `file-service.test.ts`: File upload and management

## CI/CD Integration
These tests can be integrated into GitHub Actions or any CI/CD pipeline.
