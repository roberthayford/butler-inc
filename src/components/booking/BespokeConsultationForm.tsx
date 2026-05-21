"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimePicker } from "./TimePicker";
import { generateTimeSlots } from "@/lib/pricing/time-slots";
import { phoneNumberSchema } from "@/lib/phone";

const consultationSchema = z.object({
  preferredServiceDate: z.date().optional(),
  requestDescription: z
    .string()
    .min(10, "Please describe your request in more detail"),
  consultationDate: z.date({ error: "Please select a consultation date" }),
  consultationTime: z.string().min(1, "Please select a time"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: phoneNumberSchema,
});

export type BespokeConsultationFormData = z.infer<typeof consultationSchema>;

interface BespokeConsultationFormProps {
  onSubmit: (data: BespokeConsultationFormData) => Promise<void>;
  isSubmitting: boolean;
  initialDescription?: string;
}

const CONSULTATION_SLOTS = generateTimeSlots(9, 17, 30);

export function BespokeConsultationForm({
  onSubmit,
  isSubmitting,
  initialDescription = "",
}: BespokeConsultationFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<BespokeConsultationFormData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      requestDescription: initialDescription,
      consultationTime: "",
      name: "",
      email: "",
      phone: "",
    },
  });

  const consultationTime = watch("consultationTime");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Request description */}
      <fieldset className="space-y-3">
        <Label asChild>
          <legend className="text-optical-white text-base font-serif">
            Describe your request
          </legend>
        </Label>
        <Textarea
          {...register("requestDescription")}
          placeholder="Tell us what you need in as much detail as possible..."
          className="min-h-[120px] bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray/50 resize-none focus-visible:ring-brass"
        />
        {errors.requestDescription && (
          <p className="text-destructive text-sm" role="alert">
            {errors.requestDescription.message}
          </p>
        )}
      </fieldset>

      {/* Preferred service date */}
      <fieldset className="space-y-3">
        <Label asChild>
          <legend className="text-optical-white text-base font-serif">
            Preferred service date{" "}
            <span className="text-warm-gray/60 font-sans text-sm font-normal">
              (optional)
            </span>
          </legend>
        </Label>
        <Controller
          control={control}
          name="preferredServiceDate"
          render={({ field }) => (
            <Calendar
              mode="single"
              selected={field.value}
              onSelect={field.onChange}
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                date > addDays(new Date(), 90)
              }
              className="rounded-sm border border-primary-foreground/10 bg-primary-foreground/5 text-optical-white"
            />
          )}
        />
      </fieldset>

      {/* Consultation call booking */}
      <fieldset className="space-y-3">
        <Label asChild>
          <legend className="text-optical-white text-base font-serif">
            Book a consultation call
          </legend>
        </Label>
        <p className="text-warm-gray text-sm">
          We&apos;ll discuss your requirements and provide a custom quote.
        </p>

        <Controller
          control={control}
          name="consultationDate"
          render={({ field }) => (
            <div>
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={(date) =>
                  date < addDays(new Date(), 1) ||
                  date > addDays(new Date(), 30)
                }
                className="rounded-sm border border-primary-foreground/10 bg-primary-foreground/5 text-optical-white"
              />
              {errors.consultationDate && (
                <p className="text-destructive text-sm mt-1" role="alert">
                  {errors.consultationDate.message}
                </p>
              )}
            </div>
          )}
        />

        <TimePicker
          label="Consultation time"
          slots={CONSULTATION_SLOTS}
          value={consultationTime}
          onChange={(v) =>
            setValue("consultationTime", v, { shouldValidate: true })
          }
        />
        {errors.consultationTime && (
          <p className="text-destructive text-sm" role="alert">
            {errors.consultationTime.message}
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
          <div className="space-y-1.5">
            <label
              htmlFor="consultation-name"
              className="text-sm text-optical-white/80"
            >
              Full name
            </label>
            <Input
              id="consultation-name"
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
              htmlFor="consultation-email"
              className="text-sm text-optical-white/80"
            >
              Email address
            </label>
            <Input
              id="consultation-email"
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

          <div className="space-y-1.5">
            <label
              htmlFor="consultation-phone"
              className="text-sm text-optical-white/80"
            >
              Phone number
            </label>
            <Input
              id="consultation-phone"
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
        </div>
      </fieldset>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-6 text-lg bg-brass text-charcoal hover:bg-brass-muted font-medium"
      >
        {isSubmitting ? "Submitting..." : "Book Consultation"}
      </Button>
    </form>
  );
}
