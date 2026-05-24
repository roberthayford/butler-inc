/**
 * Returns true iff the member has at least `requiredHours` of personal
 * hours remaining in their current billing period.
 *
 * Defensive: returns false for null membership, missing fields, or
 * negative remaining (which can only happen via data corruption since
 * the CHECK constraint prevents used > total).
 *
 * A `past_due` membership always returns false — payment is failing and
 * the member has lost access to member pricing until the invoice is settled.
 */
export function hasSufficientMemberHours(
  membership:
    | { personal_hours_total: number; personal_hours_used: number; status?: string }
    | null
    | undefined,
  requiredHours: number
): boolean {
  if (!membership) return false;
  if (membership.status === "past_due") return false;
  if (
    typeof membership.personal_hours_total !== "number" ||
    typeof membership.personal_hours_used !== "number"
  ) {
    return false;
  }
  const remaining = membership.personal_hours_total - membership.personal_hours_used;
  return remaining >= requiredHours;
}
