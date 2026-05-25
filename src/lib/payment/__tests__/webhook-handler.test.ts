import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleCheckoutCompleted } from "../webhook-handler";
import type { WebhookEvent } from "../types";

function makeCheckoutEvent(overrides: Partial<{ userId: string; subId: string; priceId: string; created: number }> = {}): Extract<WebhookEvent, { type: "checkout.session.completed" }> {
  const { userId = "user-1", subId = "sub_1", priceId = "mock_lite", created = 1717000000 } = overrides;
  return {
    type: "checkout.session.completed",
    created,
    data: {
      id: "cs_1",
      client_reference_id: userId,
      customer: "cus_1",
      subscription: subId,
      current_period_start: created,
      current_period_end: created + 30 * 24 * 60 * 60,
      line_items: [{ price: { id: priceId } }],
    },
  };
}

function makeSupabaseFake() {
  const memberships: Array<Record<string, unknown>> = [];
  const tiers = [
    { id: "tier-lite", slug: "lite", personal_hours_included: 10, virtual_tasks_included: 5 },
    { id: "tier-frequent", slug: "frequent", personal_hours_included: 20, virtual_tasks_included: 10 },
    { id: "tier-pro", slug: "pro", personal_hours_included: 55, virtual_tasks_included: 25 },
  ];
  const tierBySlug = (slug: string) => tiers.find((t) => t.slug === slug);
  const tierById = (id: string) => tiers.find((t) => t.id === id);
  return {
    memberships,
    tiers,
    // auth.admin stub — readRecipient calls getUserById; return null user so
    // notifyLifecycle short-circuits gracefully (no email sent in unit tests).
    auth: {
      admin: {
        getUserById: async (_id: string) => ({ data: { user: null }, error: null }),
      },
    },
    from(table: string) {
      if (table === "memberships") {
        return {
          select: () => {
            const filters: Array<[string, unknown]> = [];
            const chain = {
              eq(col: string, val: unknown) {
                filters.push([col, val]);
                return chain;
              },
              maybeSingle: async () => ({
                data: memberships.find((m) => filters.every(([c, v]) => m[c] === v)) ?? null,
                error: null,
              }),
            };
            return chain;
          },
          insert: (row: Record<string, unknown>) => {
            memberships.push(row);
            return {
              select: () => ({
                single: async () => ({ data: row, error: null }),
                maybeSingle: async () => ({ data: row, error: null }),
              }),
            };
          },
          update: (patch: Record<string, unknown>) => ({
            eq: (col: string, val: unknown) => {
              const target = memberships.find((m) => m[col] === val);
              if (target) Object.assign(target, patch);
              return {
                select: () => ({
                  single: async () => ({ data: target, error: null }),
                  maybeSingle: async () => ({ data: target ?? null, error: null }),
                }),
              };
            },
          }),
        };
      }
      if (table === "membership_tiers") {
        return {
          select: () => ({
            eq: (col: string, val: unknown) => ({
              maybeSingle: async () => ({
                data: col === "slug"
                  ? (tierBySlug(val as string) ?? null)
                  : col === "id"
                    ? (tierById(val as string) ?? null)
                    : null,
                error: null,
              }),
            }),
          }),
        };
      }
      // lifecycle_email_log — notifyLifecycle hits this; we just no-op it so
      // the handler tests stay focused on membership-state assertions.
      if (table === "lifecycle_email_log") {
        return {
          insert: () => ({ select: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

import { handleSubscriptionUpdated, handleSubscriptionDeleted } from "../webhook-handler";
import type { SubscriptionData } from "../types";

function makeSubEvent(type: "customer.subscription.updated", overrides?: Partial<SubscriptionData & { created: number }>): Extract<WebhookEvent, { type: "customer.subscription.updated" }>;
function makeSubEvent(type: "customer.subscription.deleted", overrides?: Partial<SubscriptionData & { created: number }>): Extract<WebhookEvent, { type: "customer.subscription.deleted" }>;
function makeSubEvent(type: "customer.subscription.updated" | "customer.subscription.deleted", overrides: Partial<SubscriptionData & { created: number }> = {}) {
  const { created = 1717000000, ...rest } = overrides;
  return {
    type,
    created,
    data: {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: false,
      current_period_start: created,
      current_period_end: created + 30 * 24 * 60 * 60,
      pause_collection: null,
      items: { data: [{ price: { id: "mock_lite" } }] },
      ...rest,
    },
  };
}

describe("handleSubscriptionUpdated", () => {
  it("updates cancel_at_period_end when Stripe sets it", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", cancel_at_period_end: false, updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { cancel_at_period_end: true }), db as never);
    expect(db.memberships[0]).toMatchObject({ cancel_at_period_end: true });
  });

  it("changes tier when price_id changes", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", tier_id: "tier-lite", status: "active", updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { items: { data: [{ price: { id: "mock_frequent" } }] } }), db as never);
    expect(db.memberships[0].tier_id).toBe("tier-frequent");
  });

  it("sets status='past_due' when Stripe status flips to past_due", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { status: "past_due" }), db as never);
    expect(db.memberships[0].status).toBe("past_due");
  });

  it("sets status='cancelled' when Stripe status is 'unpaid' (retries exhausted)", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { status: "unpaid" }), db as never);
    expect(db.memberships[0].status).toBe("cancelled");
  });

  it("sets status='cancelled' when Stripe status is 'incomplete_expired'", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { status: "incomplete_expired" }), db as never);
    expect(db.memberships[0].status).toBe("cancelled");
  });

  it("sets status='past_due' when Stripe status is 'incomplete'", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { status: "incomplete" }), db as never);
    expect(db.memberships[0].status).toBe("past_due");
  });

  it("ignores stale events (event.created older than row's updated_at)", async () => {
    const db = makeSupabaseFake();
    const now = Math.floor(Date.now() / 1000);
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", cancel_at_period_end: false, updated_at: new Date(now * 1000).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { created: now - 100, cancel_at_period_end: true }), db as never);
    expect(db.memberships[0].cancel_at_period_end).toBe(false);
  });

  // ── Phase B pins ──
  // These tests pin behaviour the Phase A handler already implements, so the
  // future PlanManager surface (which depends on these transitions) does not
  // silently regress.

  it("(Phase B) cancel_at_period_end=false reactivates a pending-cancel sub", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", cancel_at_period_end: true, updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { cancel_at_period_end: false }), db as never);
    expect(db.memberships[0]).toMatchObject({ cancel_at_period_end: false, status: "active" });
  });

  it("(Phase B) Stripe status='paused' is mapped to local status='paused'", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", cancel_at_period_end: false, updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { status: "paused" }), db as never);
    expect(db.memberships[0].status).toBe("paused");
  });

  it("(Phase B) Stripe status flips paused -> active on resume", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "paused", cancel_at_period_end: false, updated_at: new Date(0).toISOString() });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { status: "active" }), db as never);
    expect(db.memberships[0].status).toBe("active");
  });

  it("(Phase B) idempotent: replaying the same updated event leaves state unchanged after the first apply", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", cancel_at_period_end: false, updated_at: new Date(0).toISOString() });
    const event = makeSubEvent("customer.subscription.updated", { cancel_at_period_end: true });
    await handleSubscriptionUpdated(event, db as never);
    const afterFirst = { ...db.memberships[0] };
    await handleSubscriptionUpdated(event, db as never);
    // Second apply may overwrite updated_at but the meaningful fields are identical
    expect(db.memberships[0].cancel_at_period_end).toBe(afterFirst.cancel_at_period_end);
    expect(db.memberships[0].status).toBe(afterFirst.status);
  });

  // ── Code-review fix #8 ──
  it("clears paused_at when status transitions paused -> active (resume via Stripe Portal)", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({
      id: "m1", user_id: "u1", stripe_subscription_id: "sub_1",
      status: "paused", paused_at: "2026-05-20T12:00:00.000Z",
      cancel_at_period_end: false, updated_at: new Date(0).toISOString(),
    });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { status: "active" }), db as never);
    expect(db.memberships[0].status).toBe("active");
    expect(db.memberships[0].paused_at).toBeNull();
  });

  it("stamps paused_at when status transitions active -> paused (pause via Stripe Portal)", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({
      id: "m1", user_id: "u1", stripe_subscription_id: "sub_1",
      status: "active", paused_at: null,
      cancel_at_period_end: false, updated_at: new Date(0).toISOString(),
    });
    await handleSubscriptionUpdated(makeSubEvent("customer.subscription.updated", { status: "paused" }), db as never);
    expect(db.memberships[0].status).toBe("paused");
    expect(typeof db.memberships[0].paused_at).toBe("string");
  });

  // ── Code-review fix #5 ──
  it("clamps personal_hours_used and virtual_tasks_used when downgrading to a smaller tier", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({
      id: "m1", user_id: "u1", stripe_subscription_id: "sub_1",
      tier_id: "tier-pro", status: "active", cancel_at_period_end: false,
      personal_hours_used: 30, virtual_tasks_used: 12,
      updated_at: new Date(0).toISOString(),
    });
    // Pro -> Lite. Lite has personal_hours_included=10, virtual_tasks_included=5.
    await handleSubscriptionUpdated(
      makeSubEvent("customer.subscription.updated", { items: { data: [{ price: { id: "mock_lite" } }] } }),
      db as never,
    );
    expect(db.memberships[0].tier_id).toBe("tier-lite");
    expect(db.memberships[0].personal_hours_total).toBe(10);
    expect(db.memberships[0].personal_hours_used).toBe(10); // clamped from 30
    expect(db.memberships[0].virtual_tasks_total).toBe(5);
    expect(db.memberships[0].virtual_tasks_used).toBe(5); // clamped from 12
  });

  it("does NOT clamp when the new tier has equal-or-greater allowance (upgrade is safe)", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({
      id: "m1", user_id: "u1", stripe_subscription_id: "sub_1",
      tier_id: "tier-lite", status: "active", cancel_at_period_end: false,
      personal_hours_used: 8, virtual_tasks_used: 4,
      updated_at: new Date(0).toISOString(),
    });
    // Lite -> Frequent (20h / 10 tasks). Used values (8, 4) fit; no clamp needed.
    await handleSubscriptionUpdated(
      makeSubEvent("customer.subscription.updated", { items: { data: [{ price: { id: "mock_frequent" } }] } }),
      db as never,
    );
    expect(db.memberships[0].tier_id).toBe("tier-frequent");
    expect(db.memberships[0].personal_hours_used).toBe(8);
    expect(db.memberships[0].virtual_tasks_used).toBe(4);
  });
});

// ── Code-review fix #6 ──
describe("handleInvoicePaymentFailed stale-event guard", () => {
  it("ignores stale invoice.payment_failed events (event.created older than row's updated_at)", async () => {
    const db = makeSupabaseFake();
    const now = Math.floor(Date.now() / 1000);
    db.memberships.push({
      id: "m1", user_id: "u1", stripe_subscription_id: "sub_1",
      status: "active", updated_at: new Date(now * 1000).toISOString(),
    });
    // Stale event from before row.updated_at — must NOT flip status to past_due.
    await handleInvoicePaymentFailed(
      makeInvoiceEvent("invoice.payment_failed", { created: now - 100 }),
      db as never,
    );
    expect(db.memberships[0].status).toBe("active");
  });
});

describe("handleSubscriptionDeleted", () => {
  it("sets status='cancelled'", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", user_id: "u1", stripe_subscription_id: "sub_1", status: "active", updated_at: new Date(0).toISOString() });
    await handleSubscriptionDeleted(makeSubEvent("customer.subscription.deleted"), db as never);
    expect(db.memberships[0].status).toBe("cancelled");
  });

  it("clears paused_at when cancelling a paused subscription", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({
      id: "m1",
      user_id: "u1",
      stripe_subscription_id: "sub_1",
      status: "paused",
      paused_at: new Date(1717000000 * 1000).toISOString(),
      updated_at: new Date(0).toISOString(),
    });
    await handleSubscriptionDeleted(makeSubEvent("customer.subscription.deleted"), db as never);
    expect(db.memberships[0]).toMatchObject({ status: "cancelled", paused_at: null });
  });
});

describe("handleCheckoutCompleted", () => {
  beforeEach(() => vi.useRealTimers());

  it("inserts a fresh membership row when none exists for the user", async () => {
    const db = makeSupabaseFake();
    await handleCheckoutCompleted(makeCheckoutEvent(), db as never);
    expect(db.memberships).toHaveLength(1);
    expect(db.memberships[0]).toMatchObject({
      user_id: "user-1",
      tier_id: "tier-lite",
      stripe_subscription_id: "sub_1",
      stripe_customer_id: "cus_1",
      status: "active",
      personal_hours_total: 10,
      virtual_tasks_total: 5,
    });
  });

  it("is idempotent — replaying the same event leaves one row", async () => {
    const db = makeSupabaseFake();
    const event = makeCheckoutEvent();
    await handleCheckoutCompleted(event, db as never);
    await handleCheckoutCompleted(event, db as never);
    expect(db.memberships).toHaveLength(1);
  });

  it("updates an existing admin-created row (no stripe_subscription_id) instead of inserting", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({
      id: "mem-existing",
      user_id: "user-1",
      tier_id: "tier-frequent",
      stripe_subscription_id: null,
      stripe_customer_id: null,
      status: "active",
      personal_hours_total: 20,
      personal_hours_used: 4,
      virtual_tasks_total: 10,
      virtual_tasks_used: 2,
    });
    await handleCheckoutCompleted(makeCheckoutEvent({ priceId: "mock_lite" }), db as never);
    expect(db.memberships).toHaveLength(1);
    expect(db.memberships[0]).toMatchObject({
      stripe_subscription_id: "sub_1",
      stripe_customer_id: "cus_1",
      tier_id: "tier-lite",
      personal_hours_total: 10,
      personal_hours_used: 0,
      virtual_tasks_total: 5,
      virtual_tasks_used: 0,
    });
  });
});

import { handleInvoicePaid, handleInvoicePaymentFailed } from "../webhook-handler";
import type { InvoiceData } from "../types";

function makeInvoiceEvent(type: "invoice.paid", overrides?: Partial<InvoiceData & { created: number }>): Extract<WebhookEvent, { type: "invoice.paid" }>;
function makeInvoiceEvent(type: "invoice.payment_failed", overrides?: Partial<InvoiceData & { created: number }>): Extract<WebhookEvent, { type: "invoice.payment_failed" }>;
function makeInvoiceEvent(type: "invoice.paid" | "invoice.payment_failed", overrides: Partial<InvoiceData & { created: number }> = {}) {
  const { created = 1717000000, ...rest } = overrides;
  return {
    type,
    created,
    data: {
      id: "in_1",
      customer: "cus_1",
      subscription: "sub_1",
      period_start: created,
      period_end: created + 30 * 24 * 60 * 60,
      status: type === "invoice.paid" ? "paid" : "open",
      ...rest,
    },
  };
}

describe("handleInvoicePaid", () => {
  it("extends billing_period_end and resets usage counters", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", stripe_subscription_id: "sub_1", status: "active", personal_hours_used: 4, virtual_tasks_used: 2, billing_period_start: "2020-01-01T00:00:00.000Z", billing_period_end: "2020-01-01T00:00:00.000Z", updated_at: new Date(0).toISOString() });
    await handleInvoicePaid(makeInvoiceEvent("invoice.paid"), db as never);
    expect(db.memberships[0]).toMatchObject({ personal_hours_used: 0, virtual_tasks_used: 0 });
    expect(db.memberships[0].billing_period_start).not.toBe("2020-01-01T00:00:00.000Z");
    expect(db.memberships[0].billing_period_end).not.toBe("2020-01-01T00:00:00.000Z");
  });

  it("revives a past_due membership to active when payment succeeds", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", stripe_subscription_id: "sub_1", status: "past_due", personal_hours_used: 0, virtual_tasks_used: 0, billing_period_end: "2020-01-01T00:00:00.000Z", updated_at: new Date(0).toISOString() });
    await handleInvoicePaid(makeInvoiceEvent("invoice.paid"), db as never);
    expect(db.memberships[0].status).toBe("active");
  });

  it("is a no-op when stripe_subscription_id is not found in memberships", async () => {
    const db = makeSupabaseFake();
    // No rows pushed — findRowBySub returns null
    await handleInvoicePaid(makeInvoiceEvent("invoice.paid", { subscription: "sub_unknown" }), db as never);
    expect(db.memberships).toHaveLength(0);
  });

  it("preserves status='paused' when invoice.paid fires for a paused subscription", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({
      id: "m1",
      stripe_subscription_id: "sub_1",
      status: "paused",
      paused_at: new Date(1717000000 * 1000).toISOString(),
      personal_hours_used: 4,
      virtual_tasks_used: 2,
      billing_period_end: "2020-01-01T00:00:00.000Z",
      updated_at: new Date(0).toISOString(),
    });
    await handleInvoicePaid(makeInvoiceEvent("invoice.paid"), db as never);
    expect(db.memberships[0]).toMatchObject({ status: "paused" });
    // Still resets counters + extends period
    expect(db.memberships[0]).toMatchObject({ personal_hours_used: 0, virtual_tasks_used: 0 });
  });

  it("ignores stale invoice.paid events (event.created older than row's updated_at)", async () => {
    const db = makeSupabaseFake();
    const now = Math.floor(Date.now() / 1000);
    db.memberships.push({
      id: "m1",
      stripe_subscription_id: "sub_1",
      status: "active",
      personal_hours_used: 3,
      virtual_tasks_used: 1,
      billing_period_end: "2020-01-01T00:00:00.000Z",
      updated_at: new Date(now * 1000).toISOString(),
    });
    await handleInvoicePaid(makeInvoiceEvent("invoice.paid", { created: now - 100 }), db as never);
    // Counters NOT reset because stale guard fired
    expect(db.memberships[0].personal_hours_used).toBe(3);
  });
});

describe("handleInvoicePaymentFailed", () => {
  it("sets status='past_due'", async () => {
    const db = makeSupabaseFake();
    db.memberships.push({ id: "m1", stripe_subscription_id: "sub_1", status: "active", updated_at: new Date(0).toISOString() });
    await handleInvoicePaymentFailed(makeInvoiceEvent("invoice.payment_failed"), db as never);
    expect(db.memberships[0].status).toBe("past_due");
  });

  it("is a no-op when stripe_subscription_id is not found in memberships", async () => {
    const db = makeSupabaseFake();
    await handleInvoicePaymentFailed(makeInvoiceEvent("invoice.payment_failed", { subscription: "sub_unknown" }), db as never);
    expect(db.memberships).toHaveLength(0);
  });
});
