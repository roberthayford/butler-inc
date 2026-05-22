import type { ButlerContent } from "@/data/content-schema";
import type { ButlerPageConfig } from "@/data/butler-page-configs";

/**
 * Merges Supabase content over static fallback config.
 * Transforms flat trustIndicators strings into { text } objects
 * to match the existing ButlerPageConfig shape.
 */
export function mergeContent(
  supabaseContent: ButlerContent | null,
  fallback: ButlerPageConfig
): ButlerPageConfig {
  if (!supabaseContent) return fallback;

  return {
    ...fallback,
    hero: {
      ...fallback.hero,
      headline: supabaseContent.hero.headline,
      subheading: supabaseContent.hero.subheading,
    },
    trustIndicators: supabaseContent.trustIndicators.map((text) => ({ text })),
    commonRequests: supabaseContent.commonRequests,
  };
}
