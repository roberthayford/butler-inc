import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPaymentGateway } from "@/lib/payment/gateway";
import { requireGatewayConfigured } from "@/lib/payment/require-gateway-configured";

const schema = z.object({ action: z.enum(["pause", "resume"]) });

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "Invalid request body" } },
      { status: 400 }
    );
  }
  const { action } = parsed.data;

  const { data: row } = await supabase
    .from("memberships")
    .select("id, user_id, status, stripe_subscription_id, cancel_at_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due", "paused", "cancelled"])
    .maybeSingle();

  if (!row || !row.stripe_subscription_id) {
    return NextResponse.json(
      { error: { code: "no_subscription", message: "No active subscription to manage" } },
      { status: 422 }
    );
  }

  // State-machine guard
  if (action === "pause") {
    const allowed = row.status === "active" && !row.cancel_at_period_end;
    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_transition",
            message: "Cannot pause from current state",
            data: { from: row.status, cancel_at_period_end: row.cancel_at_period_end, action },
          },
        },
        { status: 409 }
      );
    }
  } else {
    if (row.status !== "paused") {
      return NextResponse.json(
        {
          error: {
            code: "invalid_transition",
            message: "Cannot resume from current state",
            data: { from: row.status, action },
          },
        },
        { status: 409 }
      );
    }
  }

  // Call gateway first; DB write only on gateway success
  try {
    if (action === "pause") {
      await getPaymentGateway().pauseSubscription(row.stripe_subscription_id);
    } else {
      await getPaymentGateway().resumeSubscription(row.stripe_subscription_id);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: { code: "gateway_error", message: msg } },
      { status: 502 }
    );
  }

  // Conditional UPDATE guarded by expected current status; zero rows = race lost.
  const expectedStatus = action === "pause" ? "active" : "paused";
  const newStatus = action === "pause" ? "paused" : "active";
  const nowIso = new Date().toISOString();
  const patch =
    action === "pause"
      ? { status: "paused", paused_at: nowIso, updated_at: nowIso }
      : { status: "active", paused_at: null, updated_at: nowIso };

  const { data: updated } = await supabase
    .from("memberships")
    .update(patch)
    .eq("id", row.id)
    .eq("status", expectedStatus)
    .select()
    .maybeSingle();

  if (!updated) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_transition",
          message: `Membership state changed during ${action}`,
          data: { from: expectedStatus, action },
        },
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ status: newStatus });
}
