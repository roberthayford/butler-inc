import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebhookEvent, CheckoutSessionData, SubscriptionData } from "./types";
import { detectTransition, type MembershipRow } from "@/lib/membership/lifecycle-transitions";
import { notifyLifecycle } from "@/lib/membership/lifecycle-notifier";
import type { TierSlug } from "@/types/membership";

type DB = SupabaseClient;

function priceIdToSlug(priceId: string): string {
  return priceId.replace(/^mock_/, "").replace(/^price_/, "");
}

async function lookupTierByPriceId(db: DB, priceId: string) {
  const slug = priceIdToSlug(priceId);
  const { data } = await db.from("membership_tiers").select().eq("slug", slug).maybeSingle();
  return data as { id: string; slug: string; personal_hours_included: number; virtual_tasks_included: number } | null;
}

/**
 * Resolves a `tier_id` to a `TierSlug`, or `null` when the tier cannot be
 * resolved. Returning `null` propagates through `detectTransition` and
 * suppresses the lifecycle notification — a wrong tier name in a
 * customer-facing email is worse than no email.
 */
async function tierSlugLookup(db: DB, tierId: string | null): Promise<TierSlug | null> {
  if (!tierId) {
    console.warn("lifecycle.tier_slug_lookup.null_tier_id", { tierId });
    return null;
  }
  const { data } = await db.from("membership_tiers").select("slug").eq("id", tierId).maybeSingle();
  const slug = data?.slug as TierSlug | undefined;
  if (!slug) {
    console.warn("lifecycle.tier_slug_lookup.unknown_tier_id", { tierId });
    return null;
  }
  return slug;
}

async function readRecipient(db: DB, userId: string): Promise<{ email: string; name: string } | null> {
  // Service-role admin client only.
  const adminAuth = (db as unknown as { auth: { admin: { getUserById: (id: string) => Promise<{ data: { user: { email?: string; user_metadata?: { name?: string } } | null } }> } } }).auth.admin;
  const { data } = await adminAuth.getUserById(userId);
  const user = data?.user;
  if (!user?.email) return null;
  return { email: user.email, name: (user.user_metadata?.name as string) ?? user.email };
}

function periodFromEvent(d: CheckoutSessionData) {
  return {
    billing_period_start: new Date(d.current_period_start * 1000).toISOString(),
    billing_period_end: new Date(d.current_period_end * 1000).toISOString(),
  };
}

function asMembershipRow(row: Record<string, unknown>): MembershipRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    status: row.status as string,
    tier_id: (row.tier_id as string | null) ?? null,
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    billing_period_end: row.billing_period_end as string,
    stripe_subscription_id: (row.stripe_subscription_id as string | null) ?? null,
    updated_at: row.updated_at as string,
    personal_hours_total: (row.personal_hours_total as number) ?? 0,
    virtual_tasks_total: (row.virtual_tasks_total as number) ?? 0,
  };
}

async function safelyNotify(args: Parameters<typeof notifyLifecycle>[0], db: DB) {
  try {
    await notifyLifecycle(args, db);
  } catch (err) {
    console.error("lifecycle.notify.failed", err);
  }
}

/**
 * Construct an idempotency key for the lifecycle email log. Prefers
 * `event.id` (stable across Stripe retries AND mock simulator's
 * `evt_mock_<uuid>`); falls back to a constructed key for legacy mock
 * payloads that did not include an `id` field.
 */
function eventIdFor(event: WebhookEvent, fallbackKey: string): string {
  return event.id ?? fallbackKey;
}

export async function handleCheckoutCompleted(event: Extract<WebhookEvent, { type: "checkout.session.completed" }>, db: DB) {
  const d = event.data;
  if (!d.client_reference_id) return;
  if (!d.subscription) return;
  const priceId = d.line_items?.[0]?.price.id ?? "";
  const tier = await lookupTierByPriceId(db, priceId);
  if (!tier) {
    console.error(`webhook handleCheckoutCompleted: no tier matched priceId=${priceId} (subscription=${d.subscription}, user=${d.client_reference_id}) — membership NOT provisioned`);
    return;
  }
  const period = periodFromEvent(d);

  const { data: existingBySub } = await db.from("memberships").select().eq("stripe_subscription_id", d.subscription).maybeSingle();
  if (existingBySub) return;

  const { data: existingByUser } = await db.from("memberships").select().eq("user_id", d.client_reference_id).eq("status", "active").maybeSingle();
  const priorRow = existingByUser ? asMembershipRow(existingByUser as Record<string, unknown>) : null;

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

  let updatedRow: Record<string, unknown> | null = null;
  if (existingByUser) {
    const { data } = await db.from("memberships").update(patch).eq("id", existingByUser.id).select().maybeSingle();
    updatedRow = data;
  } else {
    const { data } = await db.from("memberships").insert({ user_id: d.client_reference_id, ...patch }).select().maybeSingle();
    updatedRow = data;
  }
  if (!updatedRow) {
    console.error("handleCheckoutCompleted: post-write select returned no row — provisioning may have failed silently", {
      user_id: d.client_reference_id,
      subscription: d.subscription,
      had_existing: Boolean(existingByUser),
    });
    return;
  }

  const recipient = await readRecipient(db, d.client_reference_id);
  if (!recipient) {
    console.warn("handleCheckoutCompleted: recipient lookup returned null — welcome email skipped", {
      user_id: d.client_reference_id,
    });
    return;
  }
  const transition = detectTransition({
    event, priorRow, updatedRow: asMembershipRow(updatedRow),
    tierSlugLookup: () => tier.slug as TierSlug,
  });
  await safelyNotify({ eventId: eventIdFor(event, `evt_checkout_${d.id}`), transition, recipient, subscriptionId: d.subscription }, db);
}

function statusFromStripe(s: SubscriptionData["status"]): "active" | "paused" | "cancelled" | "past_due" {
  if (s === "canceled" || s === "unpaid" || s === "incomplete_expired") return "cancelled";
  if (s === "paused") return "paused";
  if (s === "past_due" || s === "incomplete") return "past_due";
  return "active";
}

async function findRowBySub(db: DB, subscriptionId: string) {
  const { data } = await db.from("memberships").select().eq("stripe_subscription_id", subscriptionId).maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function handleSubscriptionUpdated(event: Extract<WebhookEvent, { type: "customer.subscription.updated" }>, db: DB) {
  const d = event.data;
  const row = await findRowBySub(db, d.id);
  if (!row) return;
  if (new Date(row.updated_at as string).getTime() / 1000 > event.created) return;

  const newPriceId = d.items.data[0]?.price.id;
  const newTier = newPriceId ? await lookupTierByPriceId(db, newPriceId) : null;
  const newStatus = statusFromStripe(d.status);
  const priorRow = asMembershipRow(row);

  const patch: Record<string, unknown> = {
    status: newStatus,
    cancel_at_period_end: d.cancel_at_period_end,
    billing_period_start: new Date(d.current_period_start * 1000).toISOString(),
    billing_period_end: new Date(d.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "paused" && row.status !== "paused") {
    patch.paused_at = new Date().toISOString();
  } else if (newStatus !== "paused" && row.status === "paused") {
    patch.paused_at = null;
  }

  if (newTier && newTier.id !== row.tier_id) {
    patch.tier_id = newTier.id;
    patch.personal_hours_total = newTier.personal_hours_included;
    patch.virtual_tasks_total = newTier.virtual_tasks_included;
    if ((row.personal_hours_used as number) > newTier.personal_hours_included) patch.personal_hours_used = newTier.personal_hours_included;
    if ((row.virtual_tasks_used as number) > newTier.virtual_tasks_included) patch.virtual_tasks_used = newTier.virtual_tasks_included;
  }
  const { data: updated } = await db.from("memberships").update(patch).eq("id", row.id as string).select().maybeSingle();
  if (!updated) {
    console.error("handleSubscriptionUpdated: post-update select returned no row", {
      subscription: d.id, user_id: row.user_id,
    });
    return;
  }

  const recipient = await readRecipient(db, row.user_id as string);
  if (!recipient) {
    console.warn("handleSubscriptionUpdated: recipient lookup returned null — notification skipped", {
      user_id: row.user_id, subscription: d.id,
    });
    return;
  }
  // Resolve OLD slug from priorRow.tier_id; NEW slug from the freshly-resolved
  // tier (newTier?.slug) or falls back to old when there was no tier change.
  // Either lookup returning null cleanly suppresses any plan_changed email
  // through detectTransition's null-guard.
  const oldSlug = await tierSlugLookup(db, priorRow.tier_id);
  const newSlug = (newTier?.slug as TierSlug | undefined) ?? oldSlug;
  const transition = detectTransition({
    event, priorRow, updatedRow: asMembershipRow(updated),
    tierSlugLookup: (id) => id === priorRow.tier_id ? oldSlug : newSlug,
  });
  await safelyNotify({ eventId: eventIdFor(event, `evt_subupd_${d.id}_${event.created}`), transition, recipient, subscriptionId: d.id }, db);
}

export async function handleSubscriptionDeleted(event: Extract<WebhookEvent, { type: "customer.subscription.deleted" }>, db: DB) {
  const row = await findRowBySub(db, event.data.id);
  if (!row) return;
  const priorRow = asMembershipRow(row);
  const { data: updated } = await db.from("memberships").update({
    status: "cancelled", paused_at: null, updated_at: new Date().toISOString(),
  }).eq("id", row.id as string).select().maybeSingle();
  if (!updated) {
    console.error("handleSubscriptionDeleted: post-update select returned no row", {
      subscription: event.data.id, user_id: row.user_id,
    });
    return;
  }

  const slug = await tierSlugLookup(db, priorRow.tier_id);
  const recipient = await readRecipient(db, row.user_id as string);
  if (!recipient) {
    console.warn("handleSubscriptionDeleted: recipient lookup returned null — notification skipped", {
      user_id: row.user_id, subscription: event.data.id,
    });
    return;
  }
  const transition = detectTransition({
    event, priorRow, updatedRow: asMembershipRow(updated), tierSlugLookup: () => slug,
  });
  await safelyNotify({ eventId: eventIdFor(event, `evt_subdel_${event.data.id}_${event.created}`), transition, recipient, subscriptionId: event.data.id }, db);
}

export async function handleInvoicePaid(event: Extract<WebhookEvent, { type: "invoice.paid" }>, db: DB) {
  const d = event.data;
  if (!d.subscription) return;
  const row = await findRowBySub(db, d.subscription);
  if (!row) return;
  if (new Date(row.updated_at as string).getTime() / 1000 > event.created) return;
  const priorRow = asMembershipRow(row);

  const patch: Record<string, unknown> = {
    billing_period_start: new Date(d.period_start * 1000).toISOString(),
    billing_period_end: new Date(d.period_end * 1000).toISOString(),
    personal_hours_used: 0,
    virtual_tasks_used: 0,
    updated_at: new Date().toISOString(),
  };
  if (row.status !== "paused") patch.status = "active";
  const { data: updated } = await db.from("memberships").update(patch).eq("id", row.id as string).select().maybeSingle();
  if (!updated) {
    console.error("handleInvoicePaid: post-update select returned no row", {
      invoice: d.id, subscription: d.subscription, user_id: row.user_id,
    });
    return;
  }

  const slug = await tierSlugLookup(db, priorRow.tier_id);
  const recipient = await readRecipient(db, row.user_id as string);
  if (!recipient) {
    console.warn("handleInvoicePaid: recipient lookup returned null — notification skipped", {
      user_id: row.user_id, invoice: d.id,
    });
    return;
  }
  const transition = detectTransition({
    event, priorRow, updatedRow: asMembershipRow(updated), tierSlugLookup: () => slug,
  });
  await safelyNotify({ eventId: eventIdFor(event, `evt_invpaid_${d.id}`), transition, recipient, subscriptionId: d.subscription }, db);
}

export async function handleInvoicePaymentFailed(event: Extract<WebhookEvent, { type: "invoice.payment_failed" }>, db: DB) {
  const d = event.data;
  if (!d.subscription) return;
  const row = await findRowBySub(db, d.subscription);
  if (!row) return;
  if (new Date(row.updated_at as string).getTime() / 1000 > event.created) return;
  const priorRow = asMembershipRow(row);
  const { data: updated } = await db.from("memberships").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("id", row.id as string).select().maybeSingle();
  if (!updated) {
    console.error("handleInvoicePaymentFailed: post-update select returned no row", {
      invoice: d.id, subscription: d.subscription, user_id: row.user_id,
    });
    return;
  }

  const slug = await tierSlugLookup(db, priorRow.tier_id);
  const recipient = await readRecipient(db, row.user_id as string);
  if (!recipient) {
    console.warn("handleInvoicePaymentFailed: recipient lookup returned null — notification skipped", {
      user_id: row.user_id, invoice: d.id,
    });
    return;
  }
  const transition = detectTransition({
    event, priorRow, updatedRow: asMembershipRow(updated), tierSlugLookup: () => slug,
  });
  await safelyNotify({ eventId: eventIdFor(event, `evt_invfail_${d.id}`), transition, recipient, subscriptionId: d.subscription }, db);
}
