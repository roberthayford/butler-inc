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
    { id: "tier-lite", slug: "lite", personal_hours_included: 5, virtual_tasks_included: 3 },
    { id: "tier-essential", slug: "essential", personal_hours_included: 15, virtual_tasks_included: 8 },
    { id: "tier-heavy", slug: "heavy", personal_hours_included: 30, virtual_tasks_included: 15 },
  ];
  const tierBySlug = (slug: string) => tiers.find((t) => t.slug === slug);
  return {
    memberships,
    tiers,
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
            return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
          },
          update: (patch: Record<string, unknown>) => ({
            eq: (col: string, val: unknown) => {
              const target = memberships.find((m) => m[col] === val);
              if (target) Object.assign(target, patch);
              return { select: () => ({ single: async () => ({ data: target, error: null }) }) };
            },
          }),
        };
      }
      if (table === "membership_tiers") {
        return {
          select: () => ({
            eq: (col: string, val: unknown) => ({
              maybeSingle: async () => ({
                data: col === "slug" ? tierBySlug(val as string) : null,
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

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
      personal_hours_total: 5,
      virtual_tasks_total: 3,
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
      tier_id: "tier-essential",
      stripe_subscription_id: null,
      stripe_customer_id: null,
      status: "active",
      personal_hours_total: 15,
      personal_hours_used: 4,
      virtual_tasks_total: 8,
      virtual_tasks_used: 2,
    });
    await handleCheckoutCompleted(makeCheckoutEvent({ priceId: "mock_lite" }), db as never);
    expect(db.memberships).toHaveLength(1);
    expect(db.memberships[0]).toMatchObject({
      stripe_subscription_id: "sub_1",
      stripe_customer_id: "cus_1",
      tier_id: "tier-lite",
      personal_hours_total: 5,
      personal_hours_used: 0,
      virtual_tasks_total: 3,
      virtual_tasks_used: 0,
    });
  });
});
