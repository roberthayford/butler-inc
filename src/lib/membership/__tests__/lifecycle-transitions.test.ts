import { describe, it, expect } from "vitest";
import { detectTransition, type MembershipRow } from "../lifecycle-transitions";
import type { WebhookEvent } from "@/lib/payment/types";

function row(overrides: Partial<MembershipRow> = {}): MembershipRow {
  return {
    id: "m1",
    user_id: "u1",
    status: "active",
    tier_id: "tier-lite",
    cancel_at_period_end: false,
    billing_period_end: "2026-06-25T00:00:00.000Z",
    stripe_subscription_id: "sub_123",
    updated_at: "2026-05-25T10:00:00.000Z",
    personal_hours_total: 10,
    virtual_tasks_total: 5,
    ...overrides,
  };
}

const lookup = (id: string | null) =>
  id === "tier-lite" ? "lite"
  : id === "tier-frequent" ? "frequent"
  : id === "tier-pro" ? "pro"
  : "lite";

describe("detectTransition", () => {
  it("fresh checkout insert → activated", () => {
    const event: WebhookEvent = {
      type: "checkout.session.completed",
      created: 1716_000_000,
      data: {
        id: "cs_1", client_reference_id: "u1", customer: "cus_1", subscription: "sub_123",
        current_period_start: 1716_000_000, current_period_end: 1718_000_000,
        line_items: [{ price: { id: "mock_lite" } }],
      },
    };
    const t = detectTransition({ event, priorRow: null, updatedRow: row(), tierSlugLookup: lookup });
    expect(t).toMatchObject({ kind: "activated", tierSlug: "lite", hoursTotal: 10, tasksTotal: 5 });
  });

  it("admin-overlap upgrade (existing row gained stripe_subscription_id) → activated", () => {
    const event: WebhookEvent = {
      type: "checkout.session.completed",
      created: 1716_000_000,
      data: {
        id: "cs_1", client_reference_id: "u1", customer: "cus_1", subscription: "sub_123",
        current_period_start: 1716_000_000, current_period_end: 1718_000_000,
        line_items: [{ price: { id: "mock_lite" } }],
      },
    };
    const prior = row({ stripe_subscription_id: null });
    const t = detectTransition({ event, priorRow: prior, updatedRow: row(), tierSlugLookup: lookup });
    expect(t.kind).toBe("activated");
  });

  it("subscription.updated active → paused", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "paused",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 0,
        pause_collection: { behavior: "keep_as_draft" }, items: { data: [{ price: { id: "mock_lite" } }] } },
    };
    const prior = row({ status: "active" });
    const updated = row({ status: "paused" });
    const t = detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup });
    expect(t).toEqual({ kind: "paused", tierSlug: "lite" });
  });

  it("subscription.updated paused → active → resumed", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "active",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 0,
        pause_collection: null, items: { data: [{ price: { id: "mock_lite" } }] } },
    };
    const prior = row({ status: "paused" });
    const updated = row({ status: "active" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "resumed", tierSlug: "lite" });
  });

  it("subscription.updated cap false→true → cancel_scheduled", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "active",
        cancel_at_period_end: true, current_period_start: 0, current_period_end: 0,
        pause_collection: null, items: { data: [{ price: { id: "mock_lite" } }] } },
    };
    const prior = row({ cancel_at_period_end: false });
    const updated = row({ cancel_at_period_end: true, billing_period_end: "2026-06-25T00:00:00.000Z" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toMatchObject({ kind: "cancel_scheduled", tierSlug: "lite", endsAt: "2026-06-25T00:00:00.000Z" });
  });

  it("subscription.updated cap true→false → cancel_reversed", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "active",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 0,
        pause_collection: null, items: { data: [{ price: { id: "mock_lite" } }] } },
    };
    const prior = row({ cancel_at_period_end: true });
    const updated = row({ cancel_at_period_end: false });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "cancel_reversed", tierSlug: "lite" });
  });

  it("subscription.updated tier changed → plan_changed", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "active",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 1718_000_000,
        pause_collection: null, items: { data: [{ price: { id: "mock_pro" } }] } },
    };
    const prior = row({ tier_id: "tier-lite" });
    const updated = row({ tier_id: "tier-pro", personal_hours_total: 55 });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toMatchObject({ kind: "plan_changed", fromTierSlug: "lite", toTierSlug: "pro", newHoursTotal: 55 });
  });

  it("subscription.updated plan change AND pause flip → paused wins", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "paused",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 0,
        pause_collection: { behavior: "keep_as_draft" },
        items: { data: [{ price: { id: "mock_pro" } }] } },
    };
    const prior = row({ status: "active", tier_id: "tier-lite" });
    const updated = row({ status: "paused", tier_id: "tier-pro" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }).kind)
      .toBe("paused");
  });

  it("subscription.updated cap already true on both sides → noop", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.updated", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "active",
        cancel_at_period_end: true, current_period_start: 0, current_period_end: 0,
        pause_collection: null, items: { data: [{ price: { id: "mock_lite" } }] } },
    };
    const prior = row({ cancel_at_period_end: true });
    const updated = row({ cancel_at_period_end: true });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "noop" });
  });

  it("subscription.deleted → cancelled", () => {
    const event: WebhookEvent = {
      type: "customer.subscription.deleted", created: 1716_000_000,
      data: { id: "sub_123", customer: "cus_1", status: "canceled",
        cancel_at_period_end: false, current_period_start: 0, current_period_end: 0,
        pause_collection: null, items: { data: [] } },
    };
    expect(detectTransition({ event, priorRow: row(), updatedRow: row({ status: "cancelled" }), tierSlugLookup: lookup }))
      .toEqual({ kind: "cancelled", tierSlug: "lite" });
  });

  it("invoice.paid with identical period → noop", () => {
    const event: WebhookEvent = {
      type: "invoice.paid", created: 1716_000_000,
      data: { id: "in_1", customer: "cus_1", subscription: "sub_123",
        period_start: 0, period_end: 1716_000_000, status: "paid" },
    };
    const prior = row({ billing_period_end: "2026-06-25T00:00:00.000Z" });
    const updated = row({ billing_period_end: "2026-06-25T00:00:00.000Z" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "noop" });
  });

  it("invoice.paid with rolled period → renewed (monthlyPrice from tier)", () => {
    const event: WebhookEvent = {
      type: "invoice.paid", created: 1716_000_000,
      data: { id: "in_1", customer: "cus_1", subscription: "sub_123",
        period_start: 0, period_end: 1720_000_000, status: "paid" },
    };
    const prior = row({ billing_period_end: "2026-05-25T00:00:00.000Z" });
    const updated = row({ billing_period_end: "2026-06-25T00:00:00.000Z" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toMatchObject({ kind: "renewed", tierSlug: "lite", periodEnd: "2026-06-25T00:00:00.000Z", monthlyPrice: 500 });
  });

  it("invoice.payment_failed active → past_due → payment_failed", () => {
    const event: WebhookEvent = {
      type: "invoice.payment_failed", created: 1716_000_000,
      data: { id: "in_1", customer: "cus_1", subscription: "sub_123",
        period_start: 0, period_end: 0, status: "open" },
    };
    const prior = row({ status: "active" });
    const updated = row({ status: "past_due" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "payment_failed", tierSlug: "lite" });
  });

  it("invoice.payment_failed already past_due → noop", () => {
    const event: WebhookEvent = {
      type: "invoice.payment_failed", created: 1716_000_000,
      data: { id: "in_1", customer: "cus_1", subscription: "sub_123",
        period_start: 0, period_end: 0, status: "open" },
    };
    const prior = row({ status: "past_due" });
    const updated = row({ status: "past_due" });
    expect(detectTransition({ event, priorRow: prior, updatedRow: updated, tierSlugLookup: lookup }))
      .toEqual({ kind: "noop" });
  });
});
