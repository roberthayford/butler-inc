// src/lib/membership/__tests__/portal-snapshot.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { stashPortalSnapshot, consumePortalSnapshot, diffSnapshot, type Snapshot } from "../portal-snapshot";

beforeEach(() => sessionStorage.clear());

describe("portal-snapshot", () => {
  it("round-trips and clears on consume", () => {
    const snap: Snapshot = { status: "active", tierSlug: "lite", cancelAtPeriodEnd: false };
    stashPortalSnapshot(snap);
    expect(consumePortalSnapshot()).toEqual(snap);
    expect(consumePortalSnapshot()).toBeNull();
  });
  it("returns null when nothing stashed", () => {
    expect(consumePortalSnapshot()).toBeNull();
  });
  it("returns null for malformed sessionStorage payload", () => {
    sessionStorage.setItem("butlers.portal.snapshot.v1", "not-json");
    expect(consumePortalSnapshot()).toBeNull();
  });
  it("diff: cancelled wins over other flips", () => {
    expect(diffSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false }, { status: "cancelled", tierSlug: "lite", cancelAtPeriodEnd: false })).toEqual({ kind: "cancelled" });
  });
  it("diff: cancel_scheduled", () => {
    expect(diffSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false }, { status: "active", tierSlug: "lite", cancelAtPeriodEnd: true })).toEqual({ kind: "cancel_scheduled" });
  });
  it("diff: cancel_reversed", () => {
    expect(diffSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: true }, { status: "active", tierSlug: "lite", cancelAtPeriodEnd: false })).toEqual({ kind: "cancel_reversed" });
  });
  it("diff: plan_changed", () => {
    expect(diffSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false }, { status: "active", tierSlug: "pro", cancelAtPeriodEnd: false })).toEqual({ kind: "plan_changed", toTier: "pro" });
  });
  it("diff: no_change", () => {
    expect(diffSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false }, { status: "active", tierSlug: "lite", cancelAtPeriodEnd: false })).toEqual({ kind: "no_change" });
  });
});
