/**
 * Returns true iff the member has at least `requiredHours` of personal
 * hours remaining in their current billing period AND the membership
 * status is active.
 *
 * Defensive: returns false for null membership, missing fields, or
 * negative remaining (which can only happen via data corruption since
 * the CHECK constraint prevents used > total).
 *
 * Non-active statuses (past_due, paused, cancelled) always return false —
 * member pricing and member-rate hours are scoped to active subscriptions
 * only. past_due: payment failing. paused: billing suspended. cancelled:
 * subscription ended.
 */
export function hasSufficientMemberHours(
  membership:
    | { personal_hours_total: number; personal_hours_used: number; status?: string }
    | null
    | undefined,
  requiredHours: number
): boolean {
  if (!membership) return false;
  // Any non-active status blocks the member gate. We explicitly allow an
  // undefined status (defensive for callers that pass a row without the
  // status column) so the gate degrades to the hours-only check.
  if (membership.status !== undefined && membership.status !== "active") return false;
  if (
    typeof membership.personal_hours_total !== "number" ||
    typeof membership.personal_hours_used !== "number"
  ) {
    return false;
  }
  const remaining = membership.personal_hours_total - membership.personal_hours_used;
  return remaining >= requiredHours;
}
