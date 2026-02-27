"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ServiceOptionSelector } from "./ServiceOptionSelector";
import { BookingForm, type BookingFormData } from "./BookingForm";
import { BUTLER_TASKS, type ButlerTypeKey } from "@/data/butler-tasks";

interface BookingFlowProps {
  butlerType: ButlerTypeKey;
}

export function BookingFlow({ butlerType }: BookingFlowProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"service" | "form">("service");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (data: BookingFormData) => {
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
        const err = await res.json();
        throw new Error(err.error ?? "Booking failed");
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
    selectedService === "bespoke" || selectedService === "other"
      ? customDescription
      : BUTLER_TASKS[butlerType].find((t) => t.id === selectedService)?.label;

  return (
    <div className="max-w-2xl mx-auto">
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
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Selected service summary */}
            <div className="mb-6 flex items-center justify-between p-3 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10">
              <span className="text-optical-white text-sm truncate mr-2">
                {selectedTaskLabel}
              </span>
              <button
                type="button"
                onClick={handleBack}
                className="text-brass text-sm hover:text-brass-muted transition-colors shrink-0"
              >
                Change
              </button>
            </div>

            <BookingForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
