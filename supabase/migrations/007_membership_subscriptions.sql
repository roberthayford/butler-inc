-- Self-serve subscriptions: link memberships to Stripe customer + subscription,
-- track cancel-at-period-end + paused state, allow 'past_due' status from invoice failures.

ALTER TABLE memberships
  ADD COLUMN stripe_customer_id text UNIQUE,
  ADD COLUMN stripe_subscription_id text UNIQUE,
  ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN paused_at timestamptz;

ALTER TABLE memberships
  DROP CONSTRAINT IF EXISTS memberships_status_check;
ALTER TABLE memberships
  ADD CONSTRAINT memberships_status_check
  CHECK (status IN ('active', 'paused', 'cancelled', 'past_due'));

CREATE INDEX IF NOT EXISTS idx_memberships_stripe_subscription_id
  ON memberships(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_memberships_stripe_customer_id
  ON memberships(stripe_customer_id);
