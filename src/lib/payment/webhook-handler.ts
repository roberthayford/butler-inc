import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebhookEvent, CheckoutSessionData } from "./types";

type DB = SupabaseClient;

function priceIdToSlug(priceId: string): string {
  return priceId.replace(/^mock_/, "").replace(/^price_/, "");
}

async function lookupTierByPriceId(db: DB, priceId: string) {
  const slug = priceIdToSlug(priceId);
  const { data } = await db.from("membership_tiers").select().eq("slug", slug).maybeSingle();
  return data as { id: string; personal_hours_included: number; virtual_tasks_included: number } | null;
}

function periodFromEvent(d: CheckoutSessionData) {
  return {
    billing_period_start: new Date(d.current_period_start * 1000).toISOString(),
    billing_period_end: new Date(d.current_period_end * 1000).toISOString(),
  };
}

export async function handleCheckoutCompleted(event: Extract<WebhookEvent, { type: "checkout.session.completed" }>, db: DB) {
  const d = event.data;
  if (!d.client_reference_id) return;
  if (!d.subscription) return;  // non-subscription checkouts not handled here
  const priceId = d.line_items?.[0]?.price.id ?? "";
  const tier = await lookupTierByPriceId(db, priceId);
  if (!tier) {
    console.error(`webhook handleCheckoutCompleted: no tier matched priceId=${priceId} (subscription=${d.subscription}, user=${d.client_reference_id}) — membership NOT provisioned`);
    return;
  }
  const period = periodFromEvent(d);

  // Case 1: idempotent replay — row already exists with this stripe_subscription_id
  const { data: existingBySub } = await db
    .from("memberships")
    .select()
    .eq("stripe_subscription_id", d.subscription)
    .maybeSingle();
  if (existingBySub) return;

  // Case 2: existing admin-created row for this user (no stripe IDs) — attach
  const { data: existingByUser } = await db
    .from("memberships")
    .select()
    .eq("user_id", d.client_reference_id)
    .eq("status", "active")
    .maybeSingle();

  const patch = {
    tier_id: tier.id,
    stripe_customer_id: d.customer,
    stripe_subscription_id: d.subscription,
    status: "active" as const,
    personal_hours_total: tier.personal_hours_included,
    personal_hours_used: 0,
    virtual_tasks_total: tier.virtual_tasks_included,
    virtual_tasks_used: 0,
    cancel_at_period_end: false,
    paused_at: null,
    updated_at: new Date().toISOString(),
    ...period,
  };

  if (existingByUser) {
    await db.from("memberships").update(patch).eq("id", existingByUser.id);
    return;
  }

  // Case 3: fresh INSERT
  await db.from("memberships").insert({ user_id: d.client_reference_id, ...patch });
}
