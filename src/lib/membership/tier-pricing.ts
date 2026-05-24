import type { TierSlug } from "@/types/membership";

const ENV_KEYS: Record<TierSlug, string> = {
  lite: "STRIPE_PRICE_LITE",
  essential: "STRIPE_PRICE_ESSENTIAL",
  heavy: "STRIPE_PRICE_HEAVY",
};

export function getTierPriceId(slug: TierSlug): string {
  const envKey = ENV_KEYS[slug];
  if (!envKey) {
    throw new Error(`unknown tier slug: ${slug}`);
  }
  return process.env[envKey] ?? `mock_${slug}`;
}
