-- OneForm Unified Platform — PostgreSQL 17 Initialization
-- Runs on first database start via docker-entrypoint-initdb.d

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Trigram indexes for fuzzy search
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- GIN index support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- Cryptographic functions

-- Enable Row Level Security globally (important!)
-- Individual table RLS is set in Prisma migrations

-- App-level settings function (used by RLS policies)
-- Call: SELECT set_config('app.current_tenant_id', 'tenant_id', true);
-- This function validates the tenant ID is set before RLS queries run
CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION app_tenant_id() IS 
  'Returns current tenant ID from session config. Used by Row Level Security policies.';
