-- Butlers Inc: Membership tables
-- Creates membership_tiers, memberships, and virtual_butler_requests tables.

-- Membership tiers (config table, seeded)
CREATE TABLE IF NOT EXISTS membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug IN ('lite', 'essential', 'heavy')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  personal_hours_included INTEGER NOT NULL,
  virtual_tasks_included INTEGER NOT NULL,
  monthly_price NUMERIC(10,2) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed tiers
INSERT INTO membership_tiers (slug, name, description, personal_hours_included, virtual_tasks_included, monthly_price, display_order) VALUES
  ('lite', 'Lite', 'Perfect for occasional butler needs', 5, 3, 49.00, 1),
  ('essential', 'Essential', 'For regular butler service users', 15, 8, 99.00, 2),
  ('heavy', 'Heavy', 'Maximum butler coverage for busy lifestyles', 30, 15, 199.00, 3);

-- Per-user membership (one active per user)
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES membership_tiers(id),
  personal_hours_total NUMERIC(5,1) NOT NULL DEFAULT 0,
  personal_hours_used NUMERIC(5,1) NOT NULL DEFAULT 0,
  virtual_tasks_total INTEGER NOT NULL DEFAULT 0,
  virtual_tasks_used INTEGER NOT NULL DEFAULT 0,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index: one active membership per user
CREATE UNIQUE INDEX idx_memberships_one_active_per_user
  ON memberships(user_id) WHERE (status = 'active');

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_status ON memberships(status);

-- Virtual butler requests
CREATE TABLE IF NOT EXISTS virtual_butler_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id),
  reference TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('appointment', 'taxi_airport', 'restaurant', 'other')),
  description TEXT NOT NULL,
  preferred_date DATE,
  preferred_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_virtual_requests_user ON virtual_butler_requests(user_id);
CREATE INDEX idx_virtual_requests_membership ON virtual_butler_requests(membership_id);
CREATE INDEX idx_virtual_requests_status ON virtual_butler_requests(status);

-- RLS policies
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_butler_requests ENABLE ROW LEVEL SECURITY;

-- Tiers: public read
CREATE POLICY "Anyone can read tiers"
  ON membership_tiers FOR SELECT USING (true);

-- Memberships: users read own, admins manage all
CREATE POLICY "Users read own membership"
  ON memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage memberships"
  ON memberships FOR ALL
  USING (auth.jwt() ->> 'email' IN ('rob@roberthayford.com', 'hello@butlersinc.com', 'roberthayford@gmail.com'));

-- Virtual requests: users read/insert own, admins manage all
CREATE POLICY "Users read own virtual requests"
  ON virtual_butler_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own virtual requests"
  ON virtual_butler_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage virtual requests"
  ON virtual_butler_requests FOR ALL
  USING (auth.jwt() ->> 'email' IN ('rob@roberthayford.com', 'hello@butlersinc.com', 'roberthayford@gmail.com'));
