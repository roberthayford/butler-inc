import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { getTierPriceId } from "@/lib/membership/tier-pricing";
import { getSiteUrl } from "@/lib/site-url";
import type { TierSlug } from "@/types/membership";

type Params = Promise<{ tier: string }>;

const VALID_TIERS: TierSlug[] = ["lite", "essential", "heavy"];

function isValidTier(slug: string): slug is TierSlug {
  return (VALID_TIERS as string[]).includes(slug);
}

export default async function CheckoutPage({ params }: { params: Params }) {
  const { tier } = await params;
  if (!isValidTier(tier)) redirect("/membership");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/members/signup?next=${encodeURIComponent(`/membership/checkout/${tier}`)}`);
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  const origin = getSiteUrl({ url: `${proto}://${host}/membership/checkout/${tier}` });

  const session = await getPaymentGateway().createSubscriptionCheckoutSession({
    tier,
    priceId: getTierPriceId(tier),
    userId: user!.id,
    customerEmail: user!.email!,
    successUrl: `${origin}/members/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/membership`,
  });

  redirect(session.url);
}
