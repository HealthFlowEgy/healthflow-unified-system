// Test setup and global configuration
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET_KEY = 'test-secret-key-do-not-use-in-production';
process.env.DATABASE_URL = 'postgresql://healthflow:test@localhost:5432/healthflow_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Close database connections, Redis connections, etc.
  await new Promise(resolve => setTimeout(resolve, 500));
});
