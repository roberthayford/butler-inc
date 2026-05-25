-- Tighten the "one membership per user" partial unique index to also cover
-- 'paused' rows. Phase B introduces user-driven pause/resume, so paused is
-- a real non-terminal state that should be exclusive per user — the same as
-- active and past_due.
--
-- Migration 008 widened the index from {active} to {active, past_due}.
-- This migration extends it to {active, past_due, paused}.
--
-- Cancelled rows remain outside the constraint: a user can re-subscribe
-- after cancelling, and we keep prior cancelled rows as historical record.
-- The application layer (readActiveMembership et al.) handles the multi-row
-- read case by ordering by created_at desc and limiting to 1.
--
-- Note (per migration 008 comments): on a small table this rebuild is
-- millisecond-fast. On a large hot table, use the CREATE UNIQUE INDEX
-- CONCURRENTLY pattern to avoid an ACCESS EXCLUSIVE window.

DROP INDEX IF EXISTS idx_memberships_one_active_per_user;

CREATE UNIQUE INDEX idx_memberships_one_active_per_user
  ON memberships(user_id)
  WHERE (status IN ('active', 'past_due', 'paused'));
