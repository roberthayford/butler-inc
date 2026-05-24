-- Widen the "one membership per user" partial unique index to also cover
-- past_due rows. Without this, a Stripe `invoice.payment_failed` webhook
-- transitioning a row to status='past_due' could theoretically allow a
-- separate code path to insert a fresh 'active' row for the same user,
-- yielding two memberships simultaneously.
--
-- Migration 007 added 'past_due' as a valid status value but the index
-- from migration 002 only enforced uniqueness for `status = 'active'`.
-- This migration closes that gap.

DROP INDEX IF EXISTS idx_memberships_one_active_per_user;

CREATE UNIQUE INDEX idx_memberships_one_active_per_user
  ON memberships(user_id)
  WHERE (status IN ('active', 'past_due'));
