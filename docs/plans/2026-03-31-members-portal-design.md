# Members Portal — Design Document

**Date:** 31 March 2026
**Status:** Approved

---

## Overview

Add a membership layer to Butlers Inc. After sign-in, members see two pathways:

- **Personal Butler** — hours-based butler services at member pricing
- **Virtual Butler** — task-based concierge requests (appointments, taxis, etc.)

Each member has a tier (Lite, Essential, Heavy) that determines their included hours and virtual tasks.

---

## Data Model

### New Tables

**`membership_tiers`** (configuration — seeded, rarely changes)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| slug | text UNIQUE | `lite`, `essential`, `heavy` |
| name | text | Display name |
| description | text | Short description |
| personal_hours_included | integer | Hours per billing period |
| virtual_tasks_included | integer | Free tasks per billing period |
| monthly_price | numeric(10,2) | Monthly subscription price |
| display_order | integer | Sort order |
| is_active | boolean | Soft delete |
| created_at | timestamptz | |

**`memberships`** (per-user, mutable state)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK auth.users UNIQUE | One active membership per user |
| tier_id | uuid FK membership_tiers | |
| personal_hours_total | numeric(5,1) | Allocated hours this period |
| personal_hours_used | numeric(5,1) | Hours consumed |
| virtual_tasks_total | integer | Allocated tasks this period |
| virtual_tasks_used | integer | Tasks consumed |
| billing_period_start | date | Current period start |
| billing_period_end | date | Current period end |
| status | text | `active`, `paused`, `cancelled` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`virtual_butler_requests`** (task submissions)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| membership_id | uuid FK memberships | |
| reference | text UNIQUE | `VB-XXXXX` format |
| category | text | `appointment`, `taxi_airport`, `restaurant`, `other` |
| description | text | What the member needs |
| preferred_date | date | nullable |
| preferred_time | text | nullable |
| status | text | `pending`, `in_progress`, `completed`, `cancelled` |
| admin_notes | text | Internal notes |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### RLS Policies

- Members can read their own `memberships` and `virtual_butler_requests`
- Members can insert `virtual_butler_requests` (own user_id only)
- Admin emails can read/update all rows
- `membership_tiers` is public read

---

## Page Structure

```
/members/dashboard            → Two-card chooser + usage summaries
/members/personal-butler      → Tier badge, hours gauge, butler service picker
/members/virtual-butler       → Tasks gauge, request form
```

### Dashboard (`/members/dashboard`)

Replaces the current booking-history-only dashboard. After sign-in, shows:

1. **Welcome header** — "Welcome back, {name}" with tier badge
2. **Two cards side-by-side:**
   - **Personal Butler** card — icon, "X of Y hours remaining", progress bar, CTA button
   - **Virtual Butler** card — icon, "X of Y tasks remaining", progress bar, CTA button
3. **Recent activity** — last 3-5 bookings/requests (collapsed, expandable)

Non-members see an upgrade prompt instead of the two cards.

### Personal Butler (`/members/personal-butler`)

1. **Tier + Hours header** — badge showing tier name, hours gauge (used/total), billing period dates
2. **Butler picker** — grid of 5 butler types (Base, Baby, Bougie, Busy, Bespoke) showing member pricing
3. **On select** — flows into existing `BookingFlow` component but with member pricing applied and hours deducted on confirmation

### Virtual Butler (`/members/virtual-butler`)

1. **Tasks header** — remaining tasks gauge, billing period
2. **Request form:**
   - Category selector (Appointment Booking, Taxi & Airport, Restaurant Reservation, Other)
   - Description textarea
   - Preferred date/time (optional)
   - Submit button
3. **Request history** — list of past virtual butler requests with status badges

---

## Member Pricing

When a member books through Personal Butler, pricing uses the member rate instead of standard rates. The booking is linked to their membership and hours are deducted from their balance.

The existing booking flow (`BookingFlow` → `PricedBookingForm`) is reused with a `memberPricing` prop that overrides the standard rate.

---

## Component Plan

### New Components

- `MemberDashboard` — two-card layout with usage summaries
- `TierBadge` — displays tier name with appropriate styling
- `UsageGauge` — progress bar showing used/total (hours or tasks)
- `PersonalButlerView` — tier header + butler picker at member rates
- `VirtualButlerView` — tasks header + request form + request history
- `VirtualRequestForm` — category, description, date/time fields
- `UpgradePrompt` — shown to non-members, links to membership info

### Modified Components

- `BookingFlow` — accept optional `memberPricing` config to override rates
- `PricedBookingForm` — display member rate when `memberPricing` provided
- `PriceCalculator` — show "Member Price" label, use member rate

---

## Open Questions (for Faridah)

These need answers before or during implementation. Development can proceed with sensible defaults and be adjusted later.

1. **Member pricing rate** — Do members get flat £35/hr for all self-service butlers (Busy, Baby, Base)? What about Bougie/Bespoke (currently £120/hr consultation)?
2. **Task rollover** — Do unused virtual tasks roll over to the next billing period?
3. **Tier allocations** — How many hours and virtual tasks per tier?
   - Lite: ? hours, ? tasks
   - Essential: ? hours, ? tasks
   - Heavy: ? hours, ? tasks
4. **Tier pricing** — Monthly price for each tier?
5. **Membership activation** — How are memberships created? Stripe subscription, manual admin setup, or both? (For soft launch, admin-activated is simplest)
6. **Overage policy** — When a member exceeds included hours, what happens? Charged at member rate, standard rate, or blocked from booking?
7. **Virtual task categories** — Appointments, taxi/airport confirmed. Others? (Restaurant reservations, event tickets, travel planning, gift sourcing?)
8. **Existing dashboard** — Move booking history to a sub-section of Personal Butler, or keep as a tab on the main dashboard?
9. **Guest bookings** — Do non-members still book as guests (current flow), or is that going away?
10. **Urgency pricing** — Does the same-day/next-day multiplier apply to member bookings, or is it flat rate regardless?

### Defaults for Development

Until Faridah answers, we'll build with:
- Member rate: £35/hr flat for self-service butlers, Bougie/Bespoke remain consultation-based
- No task rollover (simplest)
- Placeholder allocations: Lite (5 hrs, 3 tasks), Essential (15 hrs, 8 tasks), Heavy (30 hrs, 15 tasks)
- Placeholder pricing: Lite £49/mo, Essential £99/mo, Heavy £199/mo
- Admin-activated memberships (no Stripe subscription yet)
- Overage: allowed at member rate (no blocking)
- Categories: Appointment, Taxi & Airport, Restaurant, Other
- Booking history stays on dashboard as collapsible section
- Guest bookings remain available
- No urgency multiplier for members (flat member rate)

---

## Technical Notes

- Auth: existing Supabase auth — no changes needed
- Membership data fetched via Supabase client in components (same pattern as current dashboard)
- React Query for caching membership state
- New Supabase migration file for tables + seed data
- RLS policies follow existing patterns (user_id match + admin list)
