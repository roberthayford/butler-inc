import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { getTierPriceId } from "@/lib/membership/tier-pricing";
import { getSiteUrl } from "@/lib/site-url";

const schema = z.object({ tier: z.enum(["lite", "essential", "heavy"]) });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid tier" }, { status: 400 });

  const origin = getSiteUrl(request);
  const session = await getPaymentGateway().createSubscriptionCheckoutSession({
    tier: parsed.data.tier,
    priceId: getTierPriceId(parsed.data.tier),
    userId: user.id,
    customerEmail: user.email!,
    successUrl: `${origin}/members/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/membership`,
  });

  return NextResponse.json({ url: session.url });
}
