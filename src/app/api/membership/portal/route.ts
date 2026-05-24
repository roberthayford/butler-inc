import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { requireGatewayConfigured } from "@/lib/payment/require-gateway-configured";
import { getSiteUrl } from "@/lib/site-url";

const schema = z.object({ returnUrl: z.string().url().optional() });

export async function POST(request: NextRequest) {
  const guard = requireGatewayConfigured();
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Sign in required" } },
      { status: 401 }
    );
  }

  // Body is optional; only validate when present
  let parsedReturnUrl: string | undefined;
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "invalid_body", message: "Invalid request body" } },
        { status: 400 }
      );
    }
    parsedReturnUrl = parsed.data.returnUrl;
  } catch {
    // Empty body is OK; proceed with default returnUrl.
  }

  const { data: row } = await supabase
    .from("memberships")
    .select("id, status, stripe_subscription_id, stripe_customer_id")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due", "paused", "cancelled"])
    .maybeSingle();

  if (!row || !row.stripe_subscription_id || row.status === "cancelled") {
    return NextResponse.json(
      { error: { code: "no_subscription", message: "No active subscription to manage" } },
      { status: 422 }
    );
  }
  if (!row.stripe_customer_id) {
    return NextResponse.json(
      { error: { code: "no_customer", message: "No Stripe customer on file" } },
      { status: 422 }
    );
  }

  try {
    const session = await getPaymentGateway().createPortalSession({
      customerId: row.stripe_customer_id,
      returnUrl: parsedReturnUrl ?? `${getSiteUrl(request)}/members/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not yet implemented")) {
      return NextResponse.json(
        { error: { code: "gateway_not_implemented", message: msg } },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: { code: "gateway_error", message: msg } },
      { status: 502 }
    );
  }
}
