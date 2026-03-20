"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { services } from "@/data/services";
import { DAY_OPTIONS, TIME_SLOTS } from "@/data/booking-config";
import { format } from "date-fns";

// Display label lookups derived from existing data constants
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
  const { user, loading, signOut, supabase } = useAuth();
  const router = useRouter();

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

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <header className="border-b border-primary-foreground/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-serif font-bold text-optical-white">
          Butlers Inc.
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-warm-gray text-sm">
            {user?.user_metadata?.name ?? user?.email}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="border-primary-foreground/20 text-optical-white hover:bg-primary-foreground/10"
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight mb-8">
          Your Dashboard
        </h1>

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
      </main>
    </div>
  );
}
