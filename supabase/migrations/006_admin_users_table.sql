-- 006_admin_users_table.sql
-- Fix MEDIUM: Replace hardcoded admin emails in RLS policies with a table lookup.
-- This allows adding/removing admins without database migrations.

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only service role can manage admin_users (no client access)
-- No policies = no access via anon key. Service role bypasses RLS.

-- Seed with current admins
INSERT INTO admin_users (email) VALUES
  ('rob@roberthayford.com'),
  ('hello@butlersinc.com'),
  ('roberthayford@gmail.com');

-- Replace hardcoded email checks in memberships policies
DROP POLICY IF EXISTS "Admins manage memberships" ON memberships;
CREATE POLICY "Admins manage memberships"
  ON memberships FOR ALL
  USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
  );

-- Replace hardcoded email checks in virtual_butler_requests policies
DROP POLICY IF EXISTS "Admins manage virtual requests" ON virtual_butler_requests;
CREATE POLICY "Admins manage virtual requests"
  ON virtual_butler_requests FOR ALL
  USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
  );

-- Replace hardcoded email checks in site_content policies
DROP POLICY IF EXISTS "Admins can insert content" ON site_content;
DROP POLICY IF EXISTS "Admins can update content" ON site_content;
DROP POLICY IF EXISTS "Admins can delete content" ON site_content;

CREATE POLICY "Admins can insert content"
  ON site_content FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
  );

CREATE POLICY "Admins can update content"
  ON site_content FOR UPDATE
  USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
  );

CREATE POLICY "Admins can delete content"
  ON site_content FOR DELETE
  USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
  );
