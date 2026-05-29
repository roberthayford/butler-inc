"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ServiceOptionSelector } from "./ServiceOptionSelector";
import {
  PricedBookingForm,
  type PricedBookingFormData,
} from "./PricedBookingForm";
import { BookingForm, type BookingFormData } from "./BookingForm";
import { BUTLER_TASKS, type ButlerTypeKey } from "@/data/butler-tasks";
import { BUTLER_PRICING } from "@/data/pricing-config";
import { GENIE_SERVICE } from "@/data/booking-config";
import { localDateTimeToUtcIso } from "@/lib/pricing/time-slots";

/**
 * Reads a useful error message from a failed fetch response without throwing.
 * Tries JSON first, falls back to a status-based message. Without this guard
 * a non-JSON response body (e.g. a default Next.js 500 HTML page) makes
 * `res.json()` throw Safari's cryptic "The string did not match the expected
 * pattern" message and surfaces it verbatim in the toast.
 */
async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.error ?? fallback;
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}

interface BookingFlowProps {
  butlerType: ButlerTypeKey;
}

export function BookingFlow({ butlerType }: BookingFlowProps) {
  const router = useRouter();
  const pricing = BUTLER_PRICING[butlerType];
  const isSelfService = pricing.bookingType === "self_service";

  const [phase, setPhase] = useState<"service" | "form">("service");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const isGenieService = selectedService === GENIE_SERVICE.serviceOption;

  useEffect(() => {
    if (phase === "form") {
      const timer = setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleServiceSelect = (taskId: string, description?: string) => {
    setSelectedService(taskId);
    if (description) setCustomDescription(description);
    setPhase("form");
  };

  const handleBack = () => {
    setPhase("service");
    setSelectedService(null);
    setCustomDescription("");
  };

  const handlePricedSubmit = async (data: PricedBookingFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          butlerType,
          serviceOption: selectedService,
          customDescription: customDescription || undefined,
          serviceDate: format(data.serviceDate, "yyyy-MM-dd"),
          startTime: data.startTime,
          endTime: data.endTime,
          serviceStartsAtUtc: localDateTimeToUtcIso(
            format(data.serviceDate, "yyyy-MM-dd"),
            data.startTime
          ),
          customerName: data.name,
          customerEmail: data.email,
          customerPhone: data.phone,
          additionalNotes: data.notes || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Booking failed"));
      }

      const { url } = await res.json();
      router.push(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConsultationSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          butlerType,
          serviceOption: selectedService,
          customDescription: customDescription || undefined,
          ...data,
          specificDate: data.specificDate?.toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Booking failed"));
      }

      const { reference } = await res.json();
      router.push(`/booking-confirmation?ref=${reference}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTaskLabel =
    selectedService === GENIE_SERVICE.serviceOption
      ? "Genie In a Butler"
      : selectedService === "bespoke" || selectedService === "other"
        ? customDescription
        : BUTLER_TASKS[butlerType].find((t) => t.id === selectedService)?.label;

  return (
    <div
      className={isSelfService ? "max-w-4xl mx-auto" : "max-w-2xl mx-auto"}
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence mode="wait">
        {phase === "service" ? (
          <motion.div
            key="service"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ServiceOptionSelector
              butlerType={butlerType}
              onSelect={handleServiceSelect}
            />
          </motion.div>
        ) : (
          <motion.div
            ref={formRef}
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Selected service summary */}
            <div className="mb-6 flex items-center justify-between p-3 rounded-sm bg-primary-foreground/5 border border-primary-foreground/10">
              <span className="text-optical-white text-sm truncate mr-2">
                {selectedTaskLabel}
              </span>
              <button
                type="button"
                onClick={handleBack}
                className="text-brass-text text-sm hover:text-brass-muted transition-colors shrink-0"
              >
                Change
              </button>
            </div>

            {isSelfService ? (
              <PricedBookingForm
                butlerType={butlerType}
                pricing={pricing}
                serviceName={selectedTaskLabel}
                onSubmit={handlePricedSubmit}
                isSubmitting={isSubmitting}
              />
            ) : (
              <BookingForm
                onSubmit={handleConsultationSubmit}
                isSubmitting={isSubmitting}
                hideScheduling={isGenieService}
                responsePromise={
                  isGenieService ? GENIE_SERVICE.responsePromise : undefined
                }
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
