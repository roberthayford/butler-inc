import Link from "next/link";

/**
 * Shared "Back to home" link used at the foot of auth and marketing entry
 * pages. Callers provide their own wrapper/spacing.
 */
export function BackToHomeLink() {
  return (
    <Link
      href="/"
      className="text-warm-gray text-sm hover:text-optical-white transition-colors"
    >
      &larr; Back to home
    </Link>
  );
}
