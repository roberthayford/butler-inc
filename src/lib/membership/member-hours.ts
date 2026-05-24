/**
 * Returns true iff the member has at least `requiredHours` of personal
 * hours remaining in their current billing period.
 *
 * Defensive: returns false for null membership, missing fields, or
 * negative remaining (which can only happen via data corruption since
 * the CHECK constraint prevents used > total).
 */
export function hasSufficientMemberHours(
  membership:
    | { personal_hours_total: number; personal_hours_used: number }
    | null
    | undefined,
  requiredHours: number
): boolean {
  if (!membership) return false;
  if (
    typeof membership.personal_hours_total !== "number" ||
    typeof membership.personal_hours_used !== "number"
  ) {
    return false;
  }
  const remaining = membership.personal_hours_total - membership.personal_hours_used;
  return remaining >= requiredHours;
}
