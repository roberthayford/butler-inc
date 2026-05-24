-- 009_tier_rename_reprice.sql
-- Rename + reprice membership tiers ahead of Phase B self-serve work.
--
-- Lite:    £49 / 5h  / 3 tasks  →  £500   / 10h / 5 tasks
-- Frequent (was Essential): £99 / 15h / 8 tasks  →  £1,000 / 20h / 10 tasks
-- Pro      (was Heavy):     £199 / 30h / 15 tasks →  £2,500 / 55h / 25 tasks
--
-- The tier UUIDs in membership_tiers stay the same — memberships.tier_id
-- references the UUID, so existing user rows continue to point at the
-- correct (now-renamed) tier. Only slug / name / numeric columns change.

-- Drop the old slug CHECK constraint before mutating slugs.
ALTER TABLE membership_tiers
  DROP CONSTRAINT IF EXISTS membership_tiers_slug_check;

-- Lite — rename unchanged, reprice + new hours/tasks.
UPDATE membership_tiers
SET personal_hours_included = 10,
    virtual_tasks_included = 5,
    monthly_price = 500.00
WHERE slug = 'lite';

-- Essential → Frequent.
UPDATE membership_tiers
SET slug = 'frequent',
    name = 'Frequent',
    description = 'For those who count on a butler week to week',
    personal_hours_included = 20,
    virtual_tasks_included = 10,
    monthly_price = 1000.00
WHERE slug = 'essential';

-- Heavy → Pro.
UPDATE membership_tiers
SET slug = 'pro',
    name = 'Pro',
    description = 'Maximum coverage for the most demanding schedules',
    personal_hours_included = 55,
    virtual_tasks_included = 25,
    monthly_price = 2500.00
WHERE slug = 'heavy';

-- Recreate the CHECK constraint with the new allowed slug set.
ALTER TABLE membership_tiers
  ADD CONSTRAINT membership_tiers_slug_check
  CHECK (slug IN ('lite', 'frequent', 'pro'));
