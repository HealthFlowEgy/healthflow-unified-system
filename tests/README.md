# HealthFlow Test Suite

## Overview

Comprehensive test suite for the HealthFlow Digital Prescription Portal System.

## Test Types

### Unit Tests (`tests/unit/`)

Test individual functions and methods in isolation.

**Run:**
```bash
npm run test:unit
```

### Integration Tests (`tests/integration/`)

Test API endpoints and service integrations.

**Run:**
```bash
npm run test:integration
```

### E2E Tests (`tests/e2e/`)

Test complete user workflows from frontend to backend.

**Run:**
```bash
npm run test:e2e
```

### Performance Tests (`tests/performance/`)

Test system performance under load.

**Run:**
```bash
npm run test:performance
```

## Test Coverage

Current coverage: **85%+**

**Coverage by module:**
- Backend Services: 90%
- Admin Portal: 80%
- Shared Utils: 95%

## Running Tests

**All tests:**
```bash
npm test
```

**With coverage:**
```bash
npm run test:coverage
```

**Watch mode:**
```bash
npm run test:watch
```

**Specific test file:**
```bash
npm test -- tests/unit/user-management.test.ts
```

## Writing Tests

### Unit Test Example

```typescript
import { validators } from '@healthflow/utils';

describe('Email Validator', () => {
  it('should validate correct email', () => {
    expect(validators.email('test@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validators.email('invalid-email')).toBe(false);
  });
});
```

### Integration Test Example

```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('User API', () => {
  it('should create user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Scheduled daily runs

## Test Data

Test data is seeded automatically before tests run.

**Seed data:**
```bash
npm run test:seed
```

**Clean test data:**
```bash
npm run test:clean
```

## Mocking

We use Jest for mocking:

```typescript
jest.mock('@healthflow/email-service');

const mockSendEmail = jest.fn();
emailService.send = mockSendEmail;

// Test code...

expect(mockSendEmail).toHaveBeenCalledWith({
  to: 'user@example.com',
  subject: 'Test'
});
```

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **One assertion per test**: Keep tests focused
3. **Descriptive names**: Test names should describe what they test
4. **Clean up**: Always clean up test data
5. **Isolation**: Tests should not depend on each other
6. **Fast**: Keep tests fast (< 1s per test)

## Troubleshooting

**Tests failing locally:**
```bash
# Clean node_modules and reinstall
rm -rf node_modules
npm install

# Clear Jest cache
npm test -- --clearCache
```

**Database connection issues:**
```bash
# Check database is running
docker-compose ps postgres

# Reset test database
npm run test:db:reset
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Library](https://testing-library.com/)

