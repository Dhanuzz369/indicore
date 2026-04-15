-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: get_all_auth_users
-- Purpose: Allows the admin panel to list all registered users without needing
--          the service_role key. Uses SECURITY DEFINER so the function runs
--          with DB-owner privileges (can read auth.users) even when called
--          with a scoped Secret API key.
--
-- How to deploy:
--   Supabase Dashboard → SQL Editor → paste this → Run
--
-- After deploying:
--   1. Create a Secret API key in Supabase Dashboard → Settings → API → Secret API Keys
--   2. Add it to .env.local as SUPABASE_ADMIN_SECRET_KEY=sbp_xxxxx
--   3. The service_role key (SUPABASE_SERVICE_ROLE_KEY) can then be removed
--      from your app entirely.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_all_auth_users()
RETURNS TABLE (
  id          uuid,
  email       text,
  created_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id, email, created_at
  FROM auth.users
  ORDER BY created_at DESC;
$$;

-- Lock it down: only service_role (and any role you explicitly grant) can call it.
-- The anon and authenticated roles cannot enumerate users.
REVOKE EXECUTE ON FUNCTION get_all_auth_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_all_auth_users() FROM anon;
REVOKE EXECUTE ON FUNCTION get_all_auth_users() FROM authenticated;
GRANT  EXECUTE ON FUNCTION get_all_auth_users() TO service_role;

-- If you want a dedicated admin DB role instead of service_role, create one:
-- CREATE ROLE indicore_admin;
-- GRANT  EXECUTE ON FUNCTION get_all_auth_users() TO indicore_admin;
-- Then assign that role to your Secret API key in the Supabase dashboard.
