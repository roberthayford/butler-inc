"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import { addDays, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimePicker } from "./TimePicker";
import { PriceCalculator } from "./PriceCalculator";
import {
  generateTimeSlots,
  getAvailableEndTimes,
  filterPastTimes,
  filterSlotsByLeadTime,
} from "@/lib/pricing/time-slots";
import { calculatePricePreview } from "@/lib/pricing/calculate-price";
import { URGENCY_MULTIPLIERS } from "@/data/pricing-config";
import type { ButlerPricing } from "@/lib/pricing/types";
import type { ButlerTypeKey } from "@/data/butler-tasks";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { phoneNumberSchema } from "@/lib/phone";

const pricedBookingBaseSchema = z.object({
  serviceDate: z.date({ error: "Please select a date" }),
  startTime: z.string().min(1, "Please select a start time"),
  endTime: z.string().min(1, "Please select an end time"),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: phoneNumberSchema,
  notes: z.string().max(500).optional(),
});

const signedOutPricedBookingSchema = z.object({
  serviceDate: z.date({ error: "Please select a date" }),
  startTime: z.string().min(1, "Please select a start time"),
  endTime: z.string().min(1, "Please select an end time"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: phoneNumberSchema,
  notes: z.string().max(500).optional(),
});

export type PricedBookingFormData = z.infer<typeof pricedBookingBaseSchema>;

interface PricedBookingFormProps {
  butlerType: ButlerTypeKey;
  pricing: ButlerPricing;
  serviceName?: string | null;
  onSubmit: (data: PricedBookingFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function PricedBookingForm({
  butlerType,
  pricing,
  serviceName,
  onSubmit,
  isSubmitting,
}: PricedBookingFormProps) {
  const { user, loading: authLoading } = useAuth();
  const { isMember } = useMembership();
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<PricedBookingFormData>({
    resolver: zodResolver(user ? pricedBookingBaseSchema : signedOutPricedBookingSchema),
    mode: "onChange",
    defaultValues: {
      startTime: "",
      endTime: "",
      name: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!authLoading && user) {
      reset(
        {
          startTime: "",
          endTime: "",
          name: (user.user_metadata?.name as string) ?? "",
          email: user.email ?? "",
          phone: (user.user_metadata?.phone as string) ?? "",
          notes: "",
        },
        { keepDirtyValues: true }
      );
    }
  }, [user, authLoading, reset]);

  const selectedDate = watch("serviceDate");
  const startTime = watch("startTime");
  const endTime = watch("endTime");

  const dateString = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : null;

  const startSlots = useMemo(() => {
    const base = generateTimeSlots(6, 22, 15);
    if (!dateString) return base;
    return filterSlotsByLeadTime(
      filterPastTimes(base, dateString),
      dateString,
      pricing.leadTimeHours
    );
  }, [dateString, pricing.leadTimeHours]);

  const endSlots = useMemo(() => {
    if (!startTime || !pricing.minimumHours) return [];
    return getAvailableEndTimes(startTime, pricing.minimumHours, 23);
  }, [startTime, pricing.minimumHours]);

  const handleStartTimeChange = useCallback(
    (value: string) => {
      setValue("startTime", value, { shouldValidate: true });
      setValue("endTime", "", { shouldValidate: false });
    },
    [setValue]
  );

  useEffect(() => {
    if (startTime && !startSlots.includes(startTime)) {
      setValue("startTime", "", { shouldValidate: true });
      setValue("endTime", "", { shouldValidate: false });
    }
  }, [startTime, startSlots, setValue]);

  const handleEndTimeChange = useCallback(
    (value: string) => {
      setValue("endTime", value, { shouldValidate: true });
    },
    [setValue]
  );

  const pricePreview = useMemo(() => {
    if (!dateString || !startTime || !endTime) return null;

    return calculatePricePreview({
      hourlyRate: pricing.hourlyRate,
      startTime,
      endTime,
      serviceDate: dateString,
      multipliers: URGENCY_MULTIPLIERS,
      isMember,
    });
  }, [dateString, startTime, endTime, pricing.hourlyRate, isMember]);

  const isFormReady = selectedDate && startTime && endTime && pricePreview;

  const submitWithLeadTimeCheck = async (data: PricedBookingFormData) => {
    if (!dateString || !startSlots.includes(data.startTime)) {
      setError("startTime", {
        type: "manual",
        message: `Please choose a start time at least ${pricing.leadTimeHours} hours from now.`,
      });
      return;
    }

    await onSubmit(data);
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8">
      <form onSubmit={handleSubmit(submitWithLeadTimeCheck)} className="space-y-8">
        {/* Date picker */}
        <fieldset className="space-y-3">
          <Label asChild>
            <legend className="text-optical-white text-base font-serif">
              When do you need this?
            </legend>
          </Label>
          <Controller
            control={control}
            name="serviceDate"
            render={({ field }) => (
              <div>
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={(date) => {
                    field.onChange(date);
                    setValue("startTime", "", { shouldValidate: false });
                    setValue("endTime", "", { shouldValidate: false });
                  }}
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                    date > addDays(new Date(), 90)
                  }
                  className="rounded-sm border border-primary-foreground/10 bg-primary-foreground/5 text-optical-white"
                />
                {errors.serviceDate && (
                  <p className="text-destructive text-sm mt-1" role="alert">
                    {errors.serviceDate.message}
                  </p>
                )}
              </div>
            )}
          />
        </fieldset>

        {/* Time pickers */}
        <fieldset className="space-y-3">
          <Label asChild>
            <legend className="text-optical-white text-base font-serif">
              Select your time
            </legend>
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <TimePicker
              label="Start time"
              slots={startSlots}
              value={startTime}
              onChange={handleStartTimeChange}
              disabled={!selectedDate}
            />
            <TimePicker
              label="End time"
              slots={endSlots}
              value={endTime}
              onChange={handleEndTimeChange}
              disabled={!startTime}
            />
          </div>
          {errors.startTime && (
            <p className="text-destructive text-sm mt-1" role="alert">
              {errors.startTime.message}
            </p>
          )}
          {pricing.minimumHours && (
            <p className="text-warm-gray/50 text-xs">
              Minimum booking: {pricing.minimumHours} hours
            </p>
          )}
          {pricing.leadTimeHours > 0 && (
            <p className="text-warm-gray/50 text-xs">
              Earliest booking: at least {pricing.leadTimeHours} hours from now
            </p>
          )}
        </fieldset>

        {/* Contact details */}
        <fieldset className="space-y-4">
          <Label asChild>
            <legend className="text-optical-white text-base font-serif">
              Your details
            </legend>
          </Label>

          <div className="space-y-3">
            {!user && (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="priced-booking-name"
                    className="text-sm text-optical-white/80"
                  >
                    Full name
                  </label>
                  <Input
                    id="priced-booking-name"
                    {...register("name")}
                    placeholder="Jane Smith"
                    autoComplete="name"
                    className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray/50 focus-visible:ring-brass"
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm mt-1" role="alert">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="priced-booking-email"
                    className="text-sm text-optical-white/80"
                  >
                    Email address
                  </label>
                  <Input
                    id="priced-booking-email"
                    {...register("email")}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray/50 focus-visible:ring-brass"
                  />
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1" role="alert">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="priced-booking-phone"
                className="text-sm text-optical-white/80"
              >
                Phone number
              </label>
              <Input
                id="priced-booking-phone"
                {...register("phone")}
                type="tel"
                placeholder="07700 900000"
                autoComplete="tel"
                className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray/50 focus-visible:ring-brass"
              />
              {errors.phone && (
                <p className="text-destructive text-sm mt-1" role="alert">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="priced-booking-notes"
                className="text-sm text-optical-white/80"
              >
                Additional notes{" "}
                <span className="text-warm-gray/60">(optional)</span>
              </label>
              <Textarea
                id="priced-booking-notes"
                {...register("notes")}
                placeholder="Any specific requirements or details..."
                className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray/50 resize-none focus-visible:ring-brass"
                rows={3}
              />
            </div>
          </div>
        </fieldset>

        <Button
          type="submit"
          disabled={isSubmitting || !isFormReady}
          className="w-full py-6 text-lg bg-brass text-charcoal hover:bg-brass-muted font-medium disabled:opacity-50"
        >
          {isSubmitting
            ? "Processing..."
            : `Continue to Payment${pricePreview ? ` · £${pricePreview.total.toFixed(2)}` : ""}`}
        </Button>

        {/* Mobile price summary */}
        <div className="lg:hidden">
          <PriceCalculator
            butlerName={pricing.name}
            serviceDate={dateString}
            startTime={startTime}
            endTime={endTime}
            pricePreview={pricePreview}
            serviceName={serviceName}
          />
        </div>
      </form>

      {/* Desktop sticky sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <PriceCalculator
            butlerName={pricing.name}
            serviceDate={dateString}
            startTime={startTime}
            endTime={endTime}
            pricePreview={pricePreview}
            serviceName={serviceName}
          />
        </div>
      </div>
    </div>
  );
}
