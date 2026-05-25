"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { TierBadge } from "@/components/membership/TierBadge";
import { UsageGauge } from "@/components/membership/UsageGauge";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { services } from "@/data/services";
import { BUTLER_PRICING } from "@/data/pricing-config";
import { MEMBER_HOURLY_RATE } from "@/data/membership-config";
import type { ButlerTypeKey } from "@/data/butler-tasks";

export default function PersonalButlerPage() {
  const { user, loading } = useAuth();
  const { membership, isLoading: memberLoading, isMember } = useMembership();
  const router = useRouter();
  const [selectedButler, setSelectedButler] = useState<ButlerTypeKey | null>(null);

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
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Personal Butler
          </h1>
          <TierBadge tier={membership.tier.slug} size="lg" />
        </div>
        <p className="text-warm-gray text-sm mb-6">
          {format(new Date(membership.billingPeriodStart), "d MMM")} &ndash;{" "}
          {format(new Date(membership.billingPeriodEnd), "d MMM yyyy")}
        </p>

        {/* Hours gauge */}
        <div className="mb-8">
          <UsageGauge
            label="Butler Hours"
            used={membership.personalHoursUsed}
            total={membership.personalHoursTotal}
            unit="hrs"
          />
        </div>

        {/* Butler selection or booking flow */}
        {selectedButler ? (
          <div>
            <button
              onClick={() => setSelectedButler(null)}
              className="text-warm-gray text-sm hover:text-optical-white transition-colors mb-4"
            >
              &larr; Choose a different butler
            </button>
            <BookingFlow butlerType={selectedButler} />
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
              Choose Your Butler
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => {
                const pricing = BUTLER_PRICING[service.id as ButlerTypeKey];
                const isSelfService = pricing?.bookingType === "self_service";
                const memberPrice = isSelfService ? MEMBER_HOURLY_RATE : pricing?.hourlyRate;
                const priceLabel = isSelfService ? `£${memberPrice}/hr` : "Price upon consultation";

                return (
                  <button
                    key={service.id}
                    onClick={() => setSelectedButler(service.id as ButlerTypeKey)}
                    className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-4 text-left hover:border-brass/40 transition-colors"
                  >
                    <p className="text-optical-white font-medium mb-1">{service.name}</p>
                    <p className="text-warm-gray text-sm mb-2">{service.subtitle}</p>
                    <p className="text-brass-text text-sm font-medium">{priceLabel}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
