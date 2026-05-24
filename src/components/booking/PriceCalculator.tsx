"use client";

import { motion, AnimatePresence } from "motion/react";
import { formatDuration } from "@/lib/pricing/time-slots";
import { format, parseISO } from "date-fns";

interface PricePreviewData {
  hourlyRate: number;
  durationHours: number;
  urgencyMultiplier: number;
  urgencyLabel: string | null;
  urgencyColour: string | null;
  subtotal: number;
  total: number;
  breakdown: string;
}

interface PriceCalculatorProps {
  butlerName: string | null;
  serviceDate: string | null;
  startTime: string;
  endTime: string;
  pricePreview: PricePreviewData | null;
  serviceName?: string | null;
}

export function PriceCalculator({
  butlerName,
  serviceDate,
  startTime,
  endTime,
  pricePreview,
  serviceName,
}: PriceCalculatorProps) {
  const formattedTotal = pricePreview
    ? new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(pricePreview.total)
    : null;

  const formattedDate = serviceDate
    ? format(parseISO(serviceDate), "EEEE d MMMM yyyy")
    : null;

  // Render the pill whenever there's a label, even at multiplier 1.0.
  // This covers the "Member rate" badge (multiplier 1.0 but a meaningful
  // label) without affecting the standard tier (label is null).
  const hasUrgency = pricePreview && pricePreview.urgencyLabel;

  return (
    <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-primary-foreground/10">
        <h3 className="text-sm uppercase tracking-widest text-warm-gray/60 font-medium">
          Booking Summary
        </h3>
      </div>

      <div className="px-5 py-5">
        <AnimatePresence mode="wait">
          {/* State 1: No selections */}
          {!butlerName && !serviceDate && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-warm-gray text-sm">
                Select a date and time to see your price.
              </p>
            </motion.div>
          )}

          {/* State 2: Partial — have butler/date but no time */}
          {butlerName && !pricePreview && (
            <motion.div
              key="partial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <p className="text-optical-white font-serif font-semibold">
                {butlerName}
                {serviceName && (
                  <span className="text-warm-gray font-sans font-normal">
                    {" "}
                    &mdash; {serviceName}
                  </span>
                )}
              </p>
              {formattedDate && (
                <p className="text-warm-gray text-sm">{formattedDate}</p>
              )}
              <p className="text-warm-gray/60 text-sm mt-3">
                Choose your start and end time to see the price.
              </p>
            </motion.div>
          )}

          {/* State 3 & 4: Complete pricing */}
          {pricePreview && (
            <motion.div
              key="complete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <p className="text-optical-white font-serif font-semibold">
                  {butlerName}
                  {serviceName && (
                    <span className="text-warm-gray font-sans font-normal">
                      {" "}
                      &mdash; {serviceName}
                    </span>
                  )}
                </p>
                {formattedDate && (
                  <p className="text-warm-gray text-sm">{formattedDate}</p>
                )}
                <p className="text-warm-gray text-sm">
                  {startTime} &ndash; {endTime} ({formatDuration(pricePreview.durationHours)})
                </p>
              </div>

              {/* Urgency badge */}
              {hasUrgency && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-sm"
                  style={{
                    backgroundColor: pricePreview.urgencyColour
                      ? `#${pricePreview.urgencyColour}15`
                      : undefined,
                    borderLeft: pricePreview.urgencyColour
                      ? `2px solid #${pricePreview.urgencyColour}`
                      : undefined,
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: pricePreview.urgencyColour
                        ? `#${pricePreview.urgencyColour}`
                        : undefined,
                    }}
                  >
                    {pricePreview.urgencyMultiplier > 1 ? "\u26A1" : "\u2714"}{" "}
                    {pricePreview.urgencyMultiplier === 1.0
                      ? pricePreview.urgencyLabel
                      : `${pricePreview.urgencyLabel}: ${pricePreview.urgencyMultiplier}x applied`}
                  </span>
                </motion.div>
              )}

              {/* Divider + Total */}
              <div className="pt-3 border-t border-primary-foreground/10 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-warm-gray text-sm">Total</span>
                  <motion.span
                    key={pricePreview.total}
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    className="text-xl font-serif font-bold text-optical-white"
                  >
                    {formattedTotal}
                  </motion.span>
                </div>
                <p className="text-warm-gray/60 text-xs">
                  {pricePreview.breakdown}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
