"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { TierBadge } from "@/components/membership/TierBadge";
import { UsageGauge } from "@/components/membership/UsageGauge";
import { VirtualRequestForm } from "@/components/membership/VirtualRequestForm";
import type { VirtualTaskCategory } from "@/types/membership";

const CATEGORY_LABELS: Record<VirtualTaskCategory, string> = {
  appointment: "Appointment Booking",
  taxi_airport: "Taxi & Airport",
  restaurant: "Restaurant Reservation",
  other: "Other Request",
};

interface VirtualRequest {
  id: string;
  reference: string;
  category: VirtualTaskCategory;
  description: string;
  status: string;
  created_at: string;
}

export default function VirtualButlerPage() {
  const { user, loading, supabase, session } = useAuth();
  const { membership, isLoading: memberLoading, isMember, virtualTasksRemaining } = useMembership();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["virtual-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("virtual_butler_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VirtualRequest[];
    },
    enabled: !!user,
  });

  const handleSubmit = async (data: {
    category: VirtualTaskCategory;
    description: string;
    preferredDate: string;
    preferredTime: string;
  }) => {
    if (!membership || !session) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/virtual-butler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          membershipId: membership.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }

      const result = await res.json();
      toast.success(`Request submitted! Reference: ${result.reference}`);

      queryClient.invalidateQueries({ queryKey: ["virtual-requests"] });
      queryClient.invalidateQueries({ queryKey: ["membership"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || memberLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  if (!isMember || !membership) {
    router.push("/members/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Virtual Butler
          </h1>
          <TierBadge tier={membership.tier.slug} size="lg" />
        </div>
        <p className="text-warm-gray text-sm mb-6">
          {format(new Date(membership.billingPeriodStart), "d MMM")} &ndash;{" "}
          {format(new Date(membership.billingPeriodEnd), "d MMM yyyy")}
        </p>

        {/* Tasks gauge */}
        <div className="mb-8">
          <UsageGauge
            label="Virtual Butler tasks"
            used={membership.virtualTasksUsed}
            total={membership.virtualTasksTotal}
            unit="tasks"
          />
        </div>

        {/* Request form */}
        {virtualTasksRemaining > 0 ? (
          <div className="mb-12">
            <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
              New Request
            </h2>
            <VirtualRequestForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        ) : (
          <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 text-center mb-12">
            <p className="text-optical-white mb-2">All Virtual Butler tasks used this period</p>
            <p className="text-warm-gray text-sm">
              Your tasks reset on {format(new Date(membership.billingPeriodEnd), "d MMMM yyyy")}.
            </p>
          </div>
        )}

        {/* Request history */}
        <section>
          <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
            Request History
          </h2>

          {requestsLoading ? (
            <p className="text-warm-gray">Loading requests...</p>
          ) : !requests.length ? (
            <p className="text-warm-gray text-sm">No virtual butler requests yet.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-optical-white font-medium text-sm">
                      {CATEGORY_LABELS[req.category]} &mdash; {req.reference}
                    </p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-brass/20 text-brass-text">
                      {req.status}
                    </span>
                  </div>
                  <p className="text-warm-gray text-sm line-clamp-2">{req.description}</p>
                  <p className="text-warm-gray text-xs mt-1">
                    {format(new Date(req.created_at), "d MMM yyyy")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
