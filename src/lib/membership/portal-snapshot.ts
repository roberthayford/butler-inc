// src/lib/membership/portal-snapshot.ts
const KEY = "butlers.portal.snapshot.v1";

export interface Snapshot {
  status: string;
  tierSlug: string;
  cancelAtPeriodEnd: boolean;
}

export type SnapshotDiff =
  | { kind: "plan_changed"; toTier: string }
  | { kind: "cancel_scheduled" }
  | { kind: "cancel_reversed" }
  | { kind: "cancelled" }
  | { kind: "no_change" };

export function stashPortalSnapshot(snap: Snapshot): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(snap)); } catch { /* sessionStorage unavailable */ }
}

export function consumePortalSnapshot(): Snapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Snapshot;
    if (typeof parsed?.status !== "string" || typeof parsed?.tierSlug !== "string" || typeof parsed?.cancelAtPeriodEnd !== "boolean") return null;
    return parsed;
  } catch { return null; }
}

export function diffSnapshot(prev: Snapshot, curr: Snapshot): SnapshotDiff {
  // `!== "cancelled"` covers both active→cancelled AND paused→cancelled (a
  // paused member who cancels via the portal). The earlier `=== "active"`
  // check missed the paused case and fell through to "no_change".
  if (prev.status !== "cancelled" && curr.status === "cancelled") return { kind: "cancelled" };
  if (!prev.cancelAtPeriodEnd && curr.cancelAtPeriodEnd) return { kind: "cancel_scheduled" };
  if (prev.cancelAtPeriodEnd && !curr.cancelAtPeriodEnd) return { kind: "cancel_reversed" };
  if (prev.tierSlug !== curr.tierSlug) return { kind: "plan_changed", toTier: curr.tierSlug };
  return { kind: "no_change" };
}
