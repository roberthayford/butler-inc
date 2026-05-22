-- 005_membership_constraints.sql
-- Fix HIGH: Add CHECK constraints to prevent usage counters from going negative
-- or exceeding their limits. Also ensures atomic quota enforcement.

ALTER TABLE memberships
  ADD CONSTRAINT chk_personal_hours_non_negative
    CHECK (personal_hours_used >= 0),
  ADD CONSTRAINT chk_personal_hours_limit
    CHECK (personal_hours_used <= personal_hours_total),
  ADD CONSTRAINT chk_virtual_tasks_non_negative
    CHECK (virtual_tasks_used >= 0),
  ADD CONSTRAINT chk_virtual_tasks_limit
    CHECK (virtual_tasks_used <= virtual_tasks_total),
  ADD CONSTRAINT chk_totals_non_negative
    CHECK (personal_hours_total >= 0 AND virtual_tasks_total >= 0);
