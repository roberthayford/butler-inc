/**
 * Returns today's UK calendar date in YYYY-MM-DD format, accounting
 * for BST (UTC+1) in summer and GMT (UTC+0) in winter.
 *
 * Use this anywhere the comparison must match the user's wall clock —
 * notably for billing-period boundaries. Plain `toISOString().slice(0,10)`
 * returns the UTC date, which is up to an hour off during BST.
 */
export function todayUK(): string {
  // en-CA locale formats Date as YYYY-MM-DD; Europe/London handles BST/GMT.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
