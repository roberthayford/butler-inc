/**
 * Normalize a Next.js searchParams value (which may be a string, an array of
 * strings, or undefined) to a single trimmed string, or null when absent/empty.
 */
export function firstString(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0]?.trim() || null;
  if (typeof v === "string") return v.trim() || null;
  return null;
}
