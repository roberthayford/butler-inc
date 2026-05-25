// src/components/members/MembershipBanner.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { Button } from "@/components/ui/button";

function formatDate(iso: string): string {
  if (!iso) return iso;
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function MembershipBanner() {
  const { membership } = useMembership();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (!membership) return null;
  const isActiveHappy = membership.status === "active" && !membership.cancelAtPeriodEnd;
  if (isActiveHappy) return null;

  async function openPortal() {
    setBusy(true);
    try {
      const res = await fetch("/api/membership/portal", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      if (!res.ok) { toast.error("Something went wrong. Please try again."); return; }
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  async function resume() {
    setBusy(true);
    try {
      const res = await fetch("/api/membership/pause", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resume" }),
      });
      if (!res.ok) { toast.error("Something went wrong. Please try again."); return; }
      toast.success("Membership resumed");
      await queryClient.invalidateQueries({ queryKey: ["membership", user?.id] });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  const tierName = membership.tier?.name ?? "Membership";

  let variant: React.ReactNode = null;
  if (membership.status === "past_due") {
    variant = (
      <div className="border border-red-700/50 bg-red-900/10 rounded-sm p-4">
        <p className="text-red-300 text-sm font-medium">{"We couldn't charge your card"}</p>
        <p className="text-warm-gray text-sm mt-2">
          Update your payment method to keep your {tierName} benefits. Your hours are paused in the meantime.
        </p>
        <Button className="mt-3 bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50" onClick={openPortal} disabled={busy}>
          Update payment method &rarr;
        </Button>
      </div>
    );
  } else if (membership.status === "paused") {
    variant = (
      <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-sm p-4">
        <p className="text-yellow-200 text-sm font-medium">Your membership is paused</p>
        <p className="text-warm-gray text-sm mt-2">
          Billing is suspended. Member pricing returns when you resume.
        </p>
        <Button className="mt-3 bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50" onClick={resume} disabled={busy}>
          Resume membership
        </Button>
      </div>
    );
  } else if (membership.status === "active" && membership.cancelAtPeriodEnd) {
    const hoursLeft = (membership.personalHoursTotal ?? 0) - (membership.personalHoursUsed ?? 0);
    variant = (
      <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-sm p-4">
        <p className="text-yellow-200 text-sm font-medium">Cancellation scheduled</p>
        <p className="text-warm-gray text-sm mt-2">
          Your {tierName} membership ends on {formatDate(membership.billingPeriodEnd)}. You can still use your remaining {hoursLeft}h until then.
        </p>
        <Button className="mt-3 bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50" onClick={openPortal} disabled={busy}>
          Reactivate subscription &rarr;
        </Button>
      </div>
    );
  }

  if (!variant) return null;

  return <div className="max-w-4xl mx-auto px-6 mt-4">{variant}</div>;
}
