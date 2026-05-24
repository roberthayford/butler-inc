import type { TierSlug } from "@/types/membership";

const ENV_KEYS: Record<TierSlug, string> = {
  lite: "STRIPE_PRICE_LITE",
  frequent: "STRIPE_PRICE_FREQUENT",
  pro: "STRIPE_PRICE_PRO",
};

export function getTierPriceId(slug: TierSlug): string {
  const envKey = ENV_KEYS[slug];
  if (!envKey) {
    throw new Error(`unknown tier slug: ${slug}`);
  }
  const value = process.env[envKey];
  return value && value.length > 0 ? value : `mock_${slug}`;
}
