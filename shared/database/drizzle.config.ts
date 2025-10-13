import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './schema/index.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://healthflow:healthflow_password@localhost:5432/healthflow'
  },
  verbose: true,
  strict: true
} satisfies Config;

