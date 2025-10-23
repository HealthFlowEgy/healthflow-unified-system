-- HealthFlow Unified System - Database Initialization
-- This file creates the initial database structure
-- The TypeScript migrations in shared/database/migrations/ will handle the detailed schema

-- Ensure the database exists (this is usually created by docker-compose environment variables)
-- CREATE DATABASE healthflow;

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a function to generate random UUIDs (if not using uuid-ossp)
-- This is a fallback in case uuid-ossp is not available
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid') THEN
        CREATE OR REPLACE FUNCTION gen_random_uuid() RETURNS uuid AS 'SELECT uuid_in(md5(random()::text || clock_timestamp()::text)::cstring)' LANGUAGE SQL;
    END IF;
END
$$;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'HealthFlow database initialized successfully';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pg_trgm, pgcrypto';
    RAISE NOTICE 'Migrations will be applied by individual services on startup';
END $$;

