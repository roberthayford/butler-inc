import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebhookEvent, CheckoutSessionData, SubscriptionData } from "./types";

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

function statusFromStripe(s: SubscriptionData["status"]): "active" | "paused" | "cancelled" | "past_due" {
  if (s === "canceled" || s === "unpaid" || s === "incomplete_expired") return "cancelled";
  if (s === "paused") return "paused";
  if (s === "past_due" || s === "incomplete") return "past_due";
  return "active";  // active, trialing
}

async function findRowBySub(db: DB, subscriptionId: string) {
  const { data } = await db.from("memberships").select().eq("stripe_subscription_id", subscriptionId).maybeSingle();
  return data as { id: string; updated_at: string; tier_id: string | null } | null;
}

export async function handleSubscriptionUpdated(event: Extract<WebhookEvent, { type: "customer.subscription.updated" }>, db: DB) {
  const d = event.data;
  const row = await findRowBySub(db, d.id);
  if (!row) return;

  // Stale-event guard
  if (new Date(row.updated_at).getTime() / 1000 > event.created) return;

  const newPriceId = d.items.data[0]?.price.id;
  const newTier = newPriceId ? await lookupTierByPriceId(db, newPriceId) : null;

  const patch: Record<string, unknown> = {
    status: statusFromStripe(d.status),
    cancel_at_period_end: d.cancel_at_period_end,
    billing_period_start: new Date(d.current_period_start * 1000).toISOString(),
    billing_period_end: new Date(d.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (newTier && newTier.id !== row.tier_id) {
    patch.tier_id = newTier.id;
    patch.personal_hours_total = newTier.personal_hours_included;
    patch.virtual_tasks_total = newTier.virtual_tasks_included;
  }
  await db.from("memberships").update(patch).eq("id", row.id);
}

export async function handleSubscriptionDeleted(event: Extract<WebhookEvent, { type: "customer.subscription.deleted" }>, db: DB) {
  const row = await findRowBySub(db, event.data.id);
  if (!row) return;
  await db.from("memberships").update({
    status: "cancelled",
    paused_at: null,
    updated_at: new Date().toISOString(),
  }).eq("id", row.id);
}
