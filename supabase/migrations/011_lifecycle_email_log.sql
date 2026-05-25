-- Idempotency log for membership lifecycle emails. Insert-first send-second:
-- the notifier inserts (event_id, transition, recipient) with ON CONFLICT DO
-- NOTHING; if the row is returned the notifier is the unique sender for that
-- triple. On Resend success the row is UPDATEd with resend_id; on Resend
-- transient failure (5xx/network) the row is DELETEd so the next Stripe
-- webhook retry can re-attempt; on permanent failure (4xx) the row is kept
-- to prevent a retry storm.
--
-- No public grants; service role only (matches the rest of the membership
-- infrastructure).

CREATE TABLE lifecycle_email_log (
  event_id     text        NOT NULL,
  transition   text        NOT NULL,
  recipient    text        NOT NULL CHECK (recipient IN ('member', 'admin')),
  sent_at      timestamptz NOT NULL DEFAULT now(),
  resend_id    text,
  PRIMARY KEY (event_id, transition, recipient)
);

ALTER TABLE lifecycle_email_log ENABLE ROW LEVEL SECURITY;
