"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Suspense } from "react";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <Link
          href="/"
          className="text-2xl font-serif font-bold text-optical-white hover:text-optical-white/80 transition-colors"
        >
          Butlers Inc.
        </Link>
        <div className="w-12 h-px bg-brass mx-auto mt-6 mb-8" />

        <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight mb-4">
          Booking Confirmed
        </h1>

        {ref ? (
          <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 mb-6">
            <p className="text-warm-gray text-sm mb-2">Your reference</p>
            <p className="text-2xl font-mono font-bold text-brass-text">{ref}</p>
          </div>
        ) : null}

        <p className="text-optical-white mb-2">
          We&apos;ll be in touch <strong>within 30 minutes</strong> to confirm
          the details.
        </p>
        <p className="text-warm-gray text-sm mb-8">
          Questions? Email us at{" "}
          <a
            href="mailto:bookings@butlersinc.com"
            className="text-brass-text hover:text-brass-muted transition-colors"
          >
            bookings@butlersinc.com
          </a>
        </p>

        <div className="space-y-3">
          {user ? (
            <Link
              href="/members/dashboard"
              className="block w-full py-3 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors text-center"
            >
              View Your Bookings
            </Link>
          ) : null}
          <Link
            href="/"
            className="block w-full py-3 rounded-sm border border-primary-foreground/20 text-optical-white hover:bg-primary-foreground/10 transition-colors text-center"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-charcoal flex items-center justify-center">
          <p className="text-warm-gray">Loading...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
