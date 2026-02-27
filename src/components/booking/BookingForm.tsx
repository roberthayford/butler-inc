"use client";

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

const bookingFormSchema = z
  .object({
    dayOption: z.enum(["sameDay", "nextDay", "advance"]),
    specificDate: z.date().optional(),
    timeSlot: z.enum(["morning", "noon", "evening"]),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().min(10, "Please enter a valid phone number"),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.dayOption !== "advance" || d.specificDate != null, {
    message: "Please select a date",
    path: ["specificDate"],
  });

export type BookingFormData = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function BookingForm({ onSubmit, isSubmitting }: BookingFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      dayOption: "advance",
      timeSlot: "morning",
      name: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  const selectedDay = watch("dayOption");
  const selectedTime = watch("timeSlot");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Day Options */}
      <div className="space-y-3">
        <Label className="text-optical-white text-base font-serif">
          When do you need this?
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DAY_OPTIONS.map((opt) => (
            <motion.button
              key={opt.key}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                setValue("dayOption", opt.key, { shouldValidate: true })
              }
              className={`
                p-4 rounded-lg text-center transition-all duration-200
                bg-primary-foreground/5 border backdrop-blur-sm
                ${
                  selectedDay === opt.key
                    ? "border-brass text-optical-white"
                    : "border-primary-foreground/10 text-warm-gray hover:border-primary-foreground/30"
                }
              `}
            >
              <span className="block font-medium">{opt.label}</span>
              <span className="block text-sm mt-1 text-brass">
                {opt.priceLabel}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

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
                  className="rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 text-optical-white"
                />
                {errors.specificDate && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.specificDate.message}
                  </p>
                )}
              </div>
            )}
          />
        </motion.div>
      )}

      {/* Time Slots */}
      <div className="space-y-3">
        <Label className="text-optical-white text-base font-serif">
          Preferred time
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {TIME_SLOTS.map((slot) => (
            <motion.button
              key={slot.key}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                setValue("timeSlot", slot.key, { shouldValidate: true })
              }
              className={`
                p-4 rounded-lg text-center transition-all duration-200
                bg-primary-foreground/5 border backdrop-blur-sm
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
      </div>

      {/* Contact Details */}
      <div className="space-y-4">
        <Label className="text-optical-white text-base font-serif">
          Your details
        </Label>

        <div className="space-y-3">
          <div>
            <Input
              {...register("name")}
              placeholder="Full name"
              className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray"
            />
            {errors.name && (
              <p className="text-destructive text-sm mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Input
              {...register("email")}
              type="email"
              placeholder="Email address"
              className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray"
            />
            {errors.email && (
              <p className="text-destructive text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Input
              {...register("phone")}
              type="tel"
              placeholder="Phone number"
              className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray"
            />
            {errors.phone && (
              <p className="text-destructive text-sm mt-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <Textarea
              {...register("notes")}
              placeholder="Additional notes (optional)"
              className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray resize-none"
              rows={3}
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-6 text-lg bg-brass text-charcoal hover:bg-brass-muted font-medium"
      >
        {isSubmitting ? "Submitting..." : "Submit Booking Request"}
      </Button>
    </form>
  );
}
