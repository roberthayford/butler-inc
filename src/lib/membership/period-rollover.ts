/**
 * Use-it-or-lose-it (UIOLO) rollover helpers, calendar-month aligned.
 *
 * When a member's billing period ends, their unused personal hours and
 * virtual tasks reset to zero and the period advances to the calendar
 * month that contains `today`. No rollover, no credit, no carryover —
 * by design (decision locked 2026-05-24, see
 * docs/superpowers/specs/2026-05-24-c-rate-pricing-uiolo-design.md).
 *
 * Calendar-month alignment was chosen over day-anchored periods because
 * day-anchored arithmetic drifts on 31st-of-month signups (e.g. Jan 31
 * + one month = Feb 31 which JS normalises to Mar 3 — see code review
 * 2026-05-24, finding #4).
 *
 * All dates are stored as YYYY-MM-DD strings (matching the DATE columns
 * in supabase/migrations/002_membership_tables.sql).
 */

/**
 * Returns true iff `today` is strictly after `billingPeriodEnd`.
 *
 * Convention: the period covers all of billingPeriodEnd inclusive — so
 * today === end means the period is still active.
 */
export function hasPeriodExpired(
  billingPeriodEnd: string,
  today: string
): boolean {
  return today > billingPeriodEnd;
}

interface PeriodInput {
  billingPeriodStart: string;
  billingPeriodEnd: string;
  today: string;
}

interface PeriodOutput {
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

/**
 * Snap the billing period to the calendar month containing `today`.
 * If today is in May 2026, returns May 1 → May 31 (whatever May's last day is).
 *
 * Existing day-anchored periods (e.g., "Jan 15 → Feb 14") are normalised
 * to calendar-month on first rollover.
 */
export function advancePeriod({ today }: PeriodInput): PeriodOutput {
  return {
    billingPeriodStart: firstDayOfMonth(today),
    billingPeriodEnd: lastDayOfMonth(today),
  };
}

interface UsageInput {
  personalHoursUsed: number;
  virtualTasksUsed: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

/**
 * Reset usage counters to zero and advance the period if expired.
 * No-op if the period is still active.
 */
export function resetUsageForNewPeriod(
  input: UsageInput,
  today: string
): UsageInput {
  if (!hasPeriodExpired(input.billingPeriodEnd, today)) {
    return input;
  }

  const advanced = advancePeriod({
    billingPeriodStart: input.billingPeriodStart,
    billingPeriodEnd: input.billingPeriodEnd,
    today,
  });

  return {
    personalHoursUsed: 0,
    virtualTasksUsed: 0,
    billingPeriodStart: advanced.billingPeriodStart,
    billingPeriodEnd: advanced.billingPeriodEnd,
  };
}

// --- date helpers (UTC-only, ISO-only) ---

/** First day of the month containing `date`. Returns YYYY-MM-DD. */
function firstDayOfMonth(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}

/**
 * Last day of the month containing `date`. Returns YYYY-MM-DD.
 * Trick: day 0 of (month + 1) is the last day of `month`.
 */
function lastDayOfMonth(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
