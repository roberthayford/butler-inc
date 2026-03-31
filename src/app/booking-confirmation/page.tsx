"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState, Suspense } from "react";
import Link from "next/link";
import { motion } from "motion/react";

interface BookingDetails {
  bookingReference: string;
  butlerType: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  hourlyRate: number;
  urgencyMultiplier: number;
  urgencyLabel: string | null;
  subtotal: number;
  totalPrice: number;
  paymentStatus: string;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const sessionId = searchParams.get("session_id");
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingDetails | null>(null);

  const isPaid = sessionId != null;

  const formattedTotal = booking
    ? new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(booking.totalPrice)
    : null;

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full text-center"
      >
        <Link
          href="/"
          className="text-2xl font-serif font-bold text-optical-white hover:text-optical-white/80 transition-colors"
        >
          Butlers Inc.
        </Link>
        <div className="w-12 h-px bg-brass mx-auto mt-6 mb-8" />

        <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight mb-4">
          {isPaid ? "Payment Received" : "Booking Confirmed"}
        </h1>

        {ref && (
          <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-6 mb-6">
            <p className="text-warm-gray text-sm mb-2">Your reference</p>
            <p className="text-2xl font-mono font-bold text-brass-text">
              {ref}
            </p>

            {isPaid && (
              <div className="mt-4 pt-4 border-t border-primary-foreground/10">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-400 text-sm font-medium">
                    Payment confirmed
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-optical-white mb-2">
          {isPaid ? (
            <>
              Your butler has been booked. We&apos;ll send a confirmation email
              shortly.
            </>
          ) : (
            <>
              We&apos;ll be in touch <strong>within 30 minutes</strong> to
              confirm the details.
            </>
          )}
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
          {user && (
            <Link
              href="/members/dashboard"
              className="block w-full py-3 rounded-sm bg-brass text-charcoal font-medium hover:bg-brass-muted transition-colors text-center"
            >
              View Your Bookings
            </Link>
          )}
          <Link
            href="/"
            className="block w-full py-3 rounded-sm border border-primary-foreground/20 text-optical-white hover:bg-primary-foreground/10 transition-colors text-center"
          >
            Back to Home
          </Link>
        </div>
      </motion.div>
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
