"use client";

import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { services } from "@/data/services";
import { DAY_OPTIONS, TIME_SLOTS } from "@/data/booking-config";
import { format } from "date-fns";
import { TierBadge } from "@/components/membership/TierBadge";
import { UsageGauge } from "@/components/membership/UsageGauge";

const BUTLER_LABELS = Object.fromEntries(services.map((s) => [s.id, s.name]));
const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map((d) => [d.key, d.label]));
const TIME_LABELS = Object.fromEntries(TIME_SLOTS.map((t) => [t.key, t.label]));

interface Booking {
  id: string;
  butler_type: string;
  service_option: string | null;
  day_option: string;
  time_slot: string;
  reference: string;
  status: string;
  created_at: string;
}

export default function MemberDashboard() {
  const { user, loading, supabase } = useAuth();
  const { membership, isLoading: memberLoading, isMember } = useMembership();

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!user,
  });

  if (loading || memberLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome + Tier */}
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Welcome back, {user?.user_metadata?.name ?? "Member"}
          </h1>
          {isMember && membership && <TierBadge tier={membership.tier.slug} size="lg" />}
        </div>

        {/* Two-card chooser (members only) */}
        {isMember && membership ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Personal Butler Card */}
            <Link
              href="/members/personal-butler"
              className="block bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 hover:border-brass/40 transition-colors"
            >
              <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
                Personal Butler
              </h2>
              <p className="text-warm-gray text-sm mb-4">
                Book butler services at your member rate
              </p>
              <UsageGauge
                label="Hours"
                used={membership.personalHoursUsed}
                total={membership.personalHoursTotal}
                unit="hrs"
              />
            </Link>

            {/* Virtual Butler Card */}
            <Link
              href="/members/virtual-butler"
              className="block bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 hover:border-brass/40 transition-colors"
            >
              <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
                Virtual Butler
              </h2>
              <p className="text-warm-gray text-sm mb-4">
                Appointments, taxis, reservations and more
              </p>
              <UsageGauge
                label="Tasks"
                used={membership.virtualTasksUsed}
                total={membership.virtualTasksTotal}
                unit="tasks"
              />
            </Link>
          </div>
        ) : membership?.status === "paused" ? (
          <div className="bg-yellow-900/10 border border-yellow-700/40 rounded-sm p-6 text-center mb-12">
            <h2 className="font-serif text-2xl text-optical-white mb-2">Membership paused</h2>
            <p className="text-warm-gray text-sm mb-4">
              Member pricing is suspended until you resume. Your remaining hours are held.
            </p>
            <Link
              href="/members/settings"
              className="inline-block bg-brass text-charcoal px-5 py-2.5 rounded-sm font-semibold text-sm"
            >
              Manage in settings
            </Link>
          </div>
        ) : membership?.status === "past_due" ? (
          <div className="bg-red-900/10 border border-red-700/50 rounded-sm p-6 text-center mb-12">
            <h2 className="font-serif text-2xl text-optical-white mb-2">
              We couldn&rsquo;t charge your card
            </h2>
            <p className="text-warm-gray text-sm mb-4">
              Update your payment method to restore your member benefits.
            </p>
            <Link
              href="/members/settings"
              className="inline-block bg-brass text-charcoal px-5 py-2.5 rounded-sm font-semibold text-sm"
            >
              Update payment
            </Link>
          </div>
        ) : membership?.status === "cancelled" ? (
          <div className="bg-white/5 border border-primary-foreground/10 rounded-sm p-6 text-center mb-12">
            <h2 className="font-serif text-2xl text-optical-white mb-2">Membership ended</h2>
            <p className="text-warm-gray text-sm mb-4">
              Your subscription has ended. You can resubscribe any time.
            </p>
            <Link
              href="/membership"
              className="inline-block bg-brass text-charcoal px-5 py-2.5 rounded-sm font-semibold text-sm"
            >
              Subscribe again
            </Link>
          </div>
        ) : (
          <div className="bg-white/5 border border-brass/30 rounded-sm p-6 text-center mb-12">
            <h2 className="font-serif text-2xl text-optical-white mb-2">Choose a plan</h2>
            <p className="text-warm-gray text-sm mb-4">
              Unlock the flat £50/hr rate and a monthly allowance of butler hours.
            </p>
            <Link
              href="/membership"
              className="inline-block bg-brass text-charcoal px-5 py-2.5 rounded-sm font-semibold text-sm"
            >
              See plans
            </Link>
          </div>
        )}

        {/* Booking History */}
        <section>
          <h2 className="text-xl font-serif font-semibold text-optical-white mb-4">
            Booking History
          </h2>

          {bookingsLoading ? (
            <p className="text-warm-gray">Loading bookings...</p>
          ) : !bookings?.length ? (
            <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-8 text-center">
              <p className="text-warm-gray mb-4">No bookings yet.</p>
              <Link href="/">
                <Button className="bg-brass text-charcoal hover:bg-brass-muted">
                  Book a Butler
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-optical-white font-medium">
                      {BUTLER_LABELS[booking.butler_type] ?? booking.butler_type} &mdash; {booking.reference}
                    </p>
                    <p className="text-warm-gray text-sm">
                      {booking.service_option ?? "Custom request"} &bull;{" "}
                      {DAY_LABELS[booking.day_option] ?? booking.day_option} &bull;{" "}
                      {TIME_LABELS[booking.time_slot] ?? booking.time_slot}
                    </p>
                    <p className="text-warm-gray text-xs mt-0.5">
                      {format(new Date(booking.created_at), "d MMM yyyy")}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-brass/20 text-brass-text">
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
