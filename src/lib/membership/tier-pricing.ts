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
  const value = process.env[envKey];
  return value && value.length > 0 ? value : `mock_${slug}`;
}
