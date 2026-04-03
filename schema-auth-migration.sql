-- Run once in Supabase SQL Editor (after schema.sql).
-- Enables email/password auth for the Express API.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN users.password_hash IS 'bcrypt hash; NULL for legacy/demo rows';
