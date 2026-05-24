"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import { DAY_OPTIONS, TIME_SLOTS } from "@/data/booking-config";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addDays } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { phoneNumberSchema } from "@/lib/phone";

const bookingFormBaseSchema = z
  .object({
    dayOption: z.enum(["sameDay", "nextDay", "advance"]),
    specificDate: z.date().optional(),
    timeSlot: z.enum(["morning", "noon", "evening"]),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: phoneNumberSchema,
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.dayOption !== "advance" || d.specificDate != null, {
    message: "Please select a date",
    path: ["specificDate"],
  });

const signedOutBookingFormSchema = z
  .object({
    dayOption: z.enum(["sameDay", "nextDay", "advance"]),
    specificDate: z.date().optional(),
    timeSlot: z.enum(["morning", "noon", "evening"]),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Please enter a valid email"),
    phone: phoneNumberSchema,
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.dayOption !== "advance" || d.specificDate != null, {
    message: "Please select a date",
    path: ["specificDate"],
  });

export type BookingFormData = z.infer<typeof bookingFormBaseSchema>;

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => Promise<void>;
  isSubmitting: boolean;
  hideScheduling?: boolean;
  responsePromise?: string;
}

export function BookingForm({
  onSubmit,
  isSubmitting,
  hideScheduling = false,
  responsePromise,
}: BookingFormProps) {
  const { user, loading: authLoading } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(user ? bookingFormBaseSchema : signedOutBookingFormSchema),
    mode: "onChange",
    defaultValues: {
      dayOption: "advance",
      timeSlot: "morning",
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
          dayOption: "advance",
          timeSlot: "morning",
          name: (user.user_metadata?.name as string) ?? "",
          email: user.email ?? "",
          phone: (user.user_metadata?.phone as string) ?? "",
          notes: "",
        },
        { keepDirtyValues: true }
      );
    }
  }, [user, authLoading, reset]);

  const selectedDay = watch("dayOption");
  const selectedTime = watch("timeSlot");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {hideScheduling && responsePromise ? (
        <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-center">
          <p className="text-optical-white font-medium">{responsePromise}</p>
        </div>
      ) : (
        <>
          {/* Day Options — accessible radiogroup */}
          <fieldset className="space-y-3">
            <Label asChild>
              <legend className="text-optical-white text-base font-serif">
                When do you need this?
              </legend>
            </Label>
            <div
              role="radiogroup"
              aria-label="Urgency and pricing"
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {DAY_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={selectedDay === opt.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    setValue("dayOption", opt.key, { shouldValidate: true })
                  }
                  className={`
                    p-4 rounded-sm text-center transition-colors duration-200
                    bg-primary-foreground/5 border backdrop-blur-sm
                    focus-visible:outline-2 focus-visible:outline-brass
                    ${
                      selectedDay === opt.key
                        ? "border-brass text-optical-white"
                        : "border-primary-foreground/10 text-warm-gray hover:border-primary-foreground/30"
                    }
                  `}
                >
                  <span className="block font-medium">{opt.label}</span>
                  <span className="block text-sm mt-1 text-brass-text">
                    {opt.priceLabel}
                  </span>
                </motion.button>
              ))}
            </div>
          </fieldset>

          {/* Date picker for advance bookings */}
          {selectedDay === "advance" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex justify-center"
            >
              <Controller
                control={control}
                name="specificDate"
                render={({ field }) => (
                  <div>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < addDays(new Date(), 3)}
                      className="rounded-sm border border-primary-foreground/10 bg-primary-foreground/5 text-optical-white"
                    />
                    {errors.specificDate && (
                      <p className="text-destructive text-sm mt-1" role="alert">
                        {errors.specificDate.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </motion.div>
          )}

          {/* Time Slots — accessible radiogroup */}
          <fieldset className="space-y-3">
            <Label asChild>
              <legend className="text-optical-white text-base font-serif">
                Preferred time
              </legend>
            </Label>
            <div
              role="radiogroup"
              aria-label="Time of day"
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {TIME_SLOTS.map((slot) => (
                <motion.button
                  key={slot.key}
                  type="button"
                  role="radio"
                  aria-checked={selectedTime === slot.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    setValue("timeSlot", slot.key, { shouldValidate: true })
                  }
                  className={`
                    p-4 rounded-sm text-center transition-colors duration-200
                    bg-primary-foreground/5 border backdrop-blur-sm
                    focus-visible:outline-2 focus-visible:outline-brass
                    ${
                      selectedTime === slot.key
                        ? "border-brass text-optical-white"
                        : "border-primary-foreground/10 text-warm-gray hover:border-primary-foreground/30"
                    }
                  `}
                >
                  <span className="block font-medium">{slot.label}</span>
                  <span className="block text-xs mt-1 opacity-70">
                    {slot.times}
                  </span>
                </motion.button>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {/* Contact Details */}
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
                <label htmlFor="booking-name" className="text-sm text-optical-white/80">
                  Full name
                </label>
                <Input
                  id="booking-name"
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
                <label htmlFor="booking-email" className="text-sm text-optical-white/80">
                  Email address
                </label>
                <Input
                  id="booking-email"
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
            <label htmlFor="booking-phone" className="text-sm text-optical-white/80">
              Phone number
            </label>
            <Input
              id="booking-phone"
              {...register("phone")}
              type="tel"
              placeholder="07700 900000"
              autoComplete="tel"
              pattern="[0-9+\s\-()]*"
              className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray/50 focus-visible:ring-brass"
            />
            {errors.phone && (
              <p className="text-destructive text-sm mt-1" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="booking-notes" className="text-sm text-optical-white/80">
              Additional notes <span className="text-warm-gray/60">(optional)</span>
            </label>
            <Textarea
              id="booking-notes"
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
        disabled={isSubmitting}
        className="w-full py-6 text-lg bg-brass text-charcoal hover:bg-brass-muted font-medium"
      >
        {isSubmitting ? "Sending your request..." : "Request Your Butler"}
      </Button>
    </form>
  );
}
