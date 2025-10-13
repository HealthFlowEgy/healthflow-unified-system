/**
 * Database Configuration
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../models/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://healthflow:password@localhost:5432/healthflow',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

