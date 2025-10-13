import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://healthflow:healthflow_password@localhost:5432/healthflow';

// Create postgres client
export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Close connection
export async function closeConnection(): Promise<void> {
  await client.end();
}

