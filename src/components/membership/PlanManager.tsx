"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useMembership } from "@/hooks/useMembership";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { stashPortalSnapshot } from "@/lib/membership/portal-snapshot";
import type { Membership } from "@/types/membership";

type PlanView =
  | { kind: "none" }
  | { kind: "active-admin"; tier: string; hoursLeft: number; hoursTotal: number; renewsAt: string }
  | { kind: "active-self"; tier: string; hoursLeft: number; hoursTotal: number; renewsAt: string }
  | { kind: "pending-cancel"; tier: string; hoursLeft: number; endsAt: string }
  | { kind: "paused"; tier: string; pausedAt: string | null }
  | { kind: "past_due"; tier: string }
  | { kind: "cancelled"; tier: string; endedAt: string };

function derivePlanView(m: Membership | null): PlanView {
  if (!m) return { kind: "none" };
  const tier = m.tier.name;
  const hoursLeft = m.personalHoursTotal - m.personalHoursUsed;
  if (m.status === "cancelled") return { kind: "cancelled", tier, endedAt: m.billingPeriodEnd };
  if (m.status === "paused") return { kind: "paused", tier, pausedAt: m.pausedAt };
  if (m.status === "past_due") return { kind: "past_due", tier };
  // status === 'active'
  if (!m.stripeSubscriptionId) {
    return { kind: "active-admin", tier, hoursLeft, hoursTotal: m.personalHoursTotal, renewsAt: m.billingPeriodEnd };
  }
  if (m.cancelAtPeriodEnd) {
    return { kind: "pending-cancel", tier, hoursLeft, endsAt: m.billingPeriodEnd };
  }
  return {
    kind: "active-self",
    tier,
    hoursLeft,
    hoursTotal: m.personalHoursTotal,
    renewsAt: m.billingPeriodEnd,
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface Handlers {
  openPortal: () => void;
  pauseOrResume: (action: "pause" | "resume") => void;
  busy: boolean;
}

function renderVariant(view: PlanView, h: Handlers) {
  switch (view.kind) {
    case "none":
      return (
        <div>
          <p className="text-optical-white mb-3">Choose a plan</p>
          <p className="text-warm-gray text-sm mb-4">You don&rsquo;t have an active membership yet.</p>
          <Link
            href="/membership"
            className="inline-block bg-brass text-charcoal px-4 py-2 rounded-sm hover:bg-brass-muted"
          >
            View plans &rarr;
          </Link>
        </div>
      );

    case "active-admin":
      return (
        <div>
          <p className="text-optical-white text-lg font-serif">Plan: {view.tier}</p>
          <p className="text-warm-gray text-sm mt-1">
            {view.hoursLeft} of {view.hoursTotal} hours remaining
          </p>
          <p className="text-warm-gray text-sm">Renews on {formatDate(view.renewsAt)}</p>
          <p className="text-warm-gray text-sm mt-4 pt-4 border-t border-primary-foreground/10">
            Your membership was set up by Butlers Inc directly. To change, pause, or cancel, contact hello@butlersinc.com.
          </p>
        </div>
      );

    case "active-self":
      return (
        <div>
          <p className="text-optical-white text-lg font-serif">Plan: {view.tier}</p>
          <p className="text-warm-gray text-sm mt-1">
            {view.hoursLeft} of {view.hoursTotal} hours remaining
          </p>
          <p className="text-warm-gray text-sm">Renews on {formatDate(view.renewsAt)}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              className="bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50"
              onClick={h.openPortal}
              disabled={h.busy}
            >
              Manage subscription &rarr;
            </Button>
            <Button
              variant="outline"
              onClick={() => h.pauseOrResume("pause")}
              disabled={h.busy}
            >
              Pause membership
            </Button>
          </div>
        </div>
      );

    case "pending-cancel":
      return (
        <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-sm p-4">
          <p className="text-yellow-200 text-sm font-medium">Cancellation scheduled</p>
          <p className="text-warm-gray text-sm mt-2">
            Your {view.tier} membership cancels on {formatDate(view.endsAt)}. You can still use your remaining {view.hoursLeft}h until then.
          </p>
          <Button
            className="mt-3 bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50"
            onClick={h.openPortal}
            disabled={h.busy}
          >
            Reactivate subscription &rarr;
          </Button>
        </div>
      );

    case "paused":
      return (
        <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-sm p-4">
          <p className="text-yellow-200 text-sm font-medium">Membership paused</p>
          <p className="text-warm-gray text-sm mt-2">
            {view.pausedAt ? `Paused on ${formatDate(view.pausedAt)}. ` : ""}
            Billing is suspended. Member pricing is not available until you resume.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              className="bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50"
              onClick={() => h.pauseOrResume("resume")}
              disabled={h.busy}
            >
              Resume membership
            </Button>
            <Button variant="outline" onClick={h.openPortal} disabled={h.busy}>
              Manage subscription &rarr;
            </Button>
          </div>
        </div>
      );

    case "past_due":
      return (
        <div className="border border-red-700/50 bg-red-900/10 rounded-sm p-4">
          <p className="text-red-300 text-sm font-medium">We couldn&rsquo;t charge your card</p>
          <p className="text-warm-gray text-sm mt-2">
            Update your payment to keep your {view.tier} benefits. Your hours are suspended in the meantime.
          </p>
          <Button
            className="mt-3 bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50"
            onClick={h.openPortal}
            disabled={h.busy}
          >
            Update payment method &rarr;
          </Button>
        </div>
      );

    case "cancelled":
      return (
        <div>
          <p className="text-warm-gray text-sm">
            Your {view.tier} membership ended on {formatDate(view.endedAt)}.
          </p>
          <Link
            href="/membership"
            className="inline-block mt-3 bg-brass text-charcoal px-4 py-2 rounded-sm hover:bg-brass-muted"
          >
            Subscribe again &rarr;
          </Link>
        </div>
      );
  }
}

export function PlanManager() {
  const { membership, isLoading } = useMembership();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setError(null);
    setBusy(true);
    try {
      if (membership) {
        stashPortalSnapshot({
          status: membership.status,
          tierSlug: membership.tier.slug,
          cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
        });
      }
      const res = await fetch("/api/membership/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function pauseOrResume(action: "pause" | "resume") {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/membership/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["membership", user?.id] });
      toast.success(action === "pause" ? "Membership paused" : "Membership resumed");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <p className="text-warm-gray">Loading...</p>;
  }

  const view = derivePlanView(membership);
  return (
    <div>
      {error && (
        <p className="text-red-400 text-sm mb-3" role="alert">
          {error}
        </p>
      )}
      {renderVariant(view, { openPortal, pauseOrResume, busy })}
    </div>
  );
}
