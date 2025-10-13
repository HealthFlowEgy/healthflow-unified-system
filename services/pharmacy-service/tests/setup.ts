// Sprint 2 - Test Setup

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { db, pool } from '../src/database/connection';
import { sql } from 'drizzle-orm';

// Test setup
beforeAll(async () => {
  console.log('Setting up test environment...');
  await pool.query('SELECT 1');
  console.log('Test environment ready');
});

// Clean up after each test
afterEach(async () => {
  // Clear test data
  await clearTestData();
});

// Clean up after all tests
afterAll(async () => {
  console.log('Cleaning up test environment...');
  await pool.end();
  console.log('Test environment cleaned up');
});

async function clearTestData() {
  await db.execute(sql`
    TRUNCATE TABLE 
      dispensing_records,
      pharmacy_inventory,
      pharmacy_staff,
      prescriptions,
      pharmacies,
      refresh_tokens,
      users
    CASCADE
  `);
}

export { db };

// ------------------------------------------------------------------------------