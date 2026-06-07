import type { ButlerContent } from "@/data/content-schema";

/**
 * Customer-facing copy policy, shared by every write path into butler content.
 *
 * The live butler pages serve hero/trustIndicators/commonRequests from the
 * Supabase `site_content` table (overriding the static config at render time,
 * see src/lib/content.ts). That means the admin content editor and the static
 * seed are BOTH write paths to what the reader sees, and both must enforce the
 * same rules. The static path is guarded by `site-content-drift.test.ts`; the
 * admin path is guarded by `updateButlerContent` calling `findCopyViolations`.
 *
 * Rule enforced: no em dashes in customer-facing copy (the project's #1 copy
 * rule). En dashes are intentionally NOT blocked here because they are valid in
 * numeric ranges (e.g. "Mon-Fri"); distinguishing misuse from ranges reliably
 * needs human judgement, so that stays a review concern, not a hard gate.
 */
export const EM_DASH = "—";

/** All customer-facing strings in a butler content blob, in render order. */
function copyStrings(content: ButlerContent): string[] {
  return [
    content.hero.headline,
    content.hero.subheading,
    ...content.trustIndicators,
    ...content.commonRequests,
  ];
}

/**
 * Returns a list of policy violations for a butler content blob. Empty array
 * means the content is clean and safe to persist.
 */
export function findCopyViolations(content: ButlerContent): string[] {
  const violations: string[] = [];
  for (const value of copyStrings(content)) {
    if (value.includes(EM_DASH)) {
      violations.push(`Em dash not allowed in customer-facing copy: "${value}"`);
    }
  }
  return violations;
}
