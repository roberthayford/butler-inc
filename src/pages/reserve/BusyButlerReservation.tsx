import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { PricingTable } from '@/components/reservation/PricingTable';
import { TaskSelection } from '@/components/reservation/TaskSelection';
import { TimeSelection } from '@/components/reservation/TimeSelection';
import { LocationInput } from '@/components/reservation/LocationInput';
import { PriceCalculator } from '@/components/reservation/PriceCalculator';
import { BookingSummary } from '@/components/reservation/BookingSummary';
import { services } from '@/data/services';
import { detectCambridgeSurcharge, BUTLER_RATES, type TimeBandKey } from '@/data/pricing-config';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

/**
 * Zod validation schema for booking form
 */
const bookingSchema = z.object({
  tasks: z.array(z.string()).optional(),
  customTask: z.string().optional(),
  showOther: z.boolean().optional(),
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, 'Date must be in the future'),
  timeBand: z.enum(['offPeak', 'standard', 'premium'], {
    required_error: 'Please select a time band',
  }),
  duration: z
    .number()
    .min(1, 'Duration must be at least 1 hour')
    .max(8, 'Duration cannot exceed 8 hours'),
  postcode: z
    .string()
    .min(1, 'Postcode is required')
    .regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, {
      message: 'Invalid UK postcode format',
    }),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  accessInstructions: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^(\+44|0)[0-9]{10}$/, {
      message: 'Invalid UK phone number format',
    }),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
}).refine(
  (data) => {
    return (
      (data.tasks && data.tasks.length > 0) ||
      (data.showOther && data.customTask && data.customTask.trim().length > 0) ||
      (data.customTask && data.customTask.trim().length > 0)
    );
  },
  {
    message: 'Please select at least one task or provide a custom task description',
    path: ['tasks'],
  },
);

type BookingFormData = z.infer<typeof bookingSchema>;

/**
 * BusyButlerReservation page
 * 
 * Complete reservation form for Busy Butler service
 * Luxury design matching brand aesthetic
 */
export default function BusyButlerReservation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const butlerType = 'busy';
  const service = services.find((s) => s.id === butlerType);

  if (!service) {
    return (
      <div className="min-h-screen bg-cream section-padding">
        <div className="max-w-5xl mx-auto">
          <p>Service not found</p>
        </div>
      </div>
    );
  }

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: {
      tasks: [],
      customTask: '',
      showOther: false,
      date: '',
      timeBand: undefined,
      duration: undefined,
      postcode: '',
      addressLine1: '',
      addressLine2: '',
      accessInstructions: '',
      name: '',
      email: '',
      phone: '',
      notes: '',
    },
  });

  const onSubmit = async (data: BookingFormData) => {
    const bookingReference = `BT-${Date.now()}`;

    const timeBand = data.timeBand as TimeBandKey;
    const rates = BUTLER_RATES[butlerType];
    const hourlyRate = rates[timeBand];
    const subtotal = hourlyRate * data.duration;
    const isCambridge = detectCambridgeSurcharge(data.postcode);
    const cambridgeSurcharge = isCambridge ? 50 : 0;
    const total = subtotal + cambridgeSurcharge;

    const pricing = {
      baseRate: hourlyRate,
      hours: data.duration,
      subtotal,
      surcharges: {
        ...(isCambridge && { cambridge: cambridgeSurcharge }),
      },
      total,
    };

    const bookingRequest = {
      reference: bookingReference,
      butlerType,
      ...data,
      pricing,
    };

    console.log('Booking Request:', bookingRequest);

    toast({
      title: 'Booking request received!',
      description: `Reference: ${bookingReference}`,
    });

    navigate('/booking-confirmation', {
      state: {
        reference: bookingReference,
        booking: bookingRequest,
        pricing,
      },
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to services
          </Link>
        </div>
      </header>

      <div className="py-12 md:py-16 lg:py-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Page header */}
          <div className="mb-12 md:mb-16">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium mb-3">
              {service.name}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
              {service.subtitle}
            </p>
          </div>

          {/* Pricing table */}
          <div className="mb-16">
            <PricingTable butlerType={butlerType} />
          </div>

          <Separator className="mb-16" />

          {/* Main content grid */}
          <Form {...form}>
            <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">
              {/* Form section */}
              <div className="lg:col-span-2 space-y-12">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                  {/* Task selection */}
                  <TaskSelection butlerType={butlerType} />

                  <Separator />

                  {/* Time selection */}
                  <TimeSelection butlerType={butlerType} />

                  <Separator />

                  {/* Location input */}
                  <LocationInput />

                  <Separator />

                  {/* Contact details */}
                  <div className="space-y-6">
                    <div>
                      <p className="text-brass font-medium uppercase tracking-widest text-xs mb-3">
                        Contact
                      </p>
                      <h3 className="font-serif text-xl font-medium mb-2">
                        Your Details
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        We'll use these to confirm your booking
                      </p>
                    </div>

                    <div className="space-y-4">
                      <FormField
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="John Smith" className="h-12" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="john.smith@example.com"
                                className="h-12"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="tel"
                                placeholder="07123 456789"
                                className="h-12"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground mt-1">
                              UK format: 07xxx or +44
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Additional notes */}
                  <div className="space-y-6">
                    <div>
                      <p className="text-brass font-medium uppercase tracking-widest text-xs mb-3">
                        Notes
                      </p>
                      <h3 className="font-serif text-xl font-medium mb-2">
                        Anything else?
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Optional additional information
                      </p>
                    </div>

                    <FormField
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Any additional information that might be helpful..."
                              maxLength={500}
                              className="min-h-[100px] resize-none"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            {field.value?.length || 0}/500 characters
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <PriceCalculator butlerType={butlerType} />
                <BookingSummary
                  butlerType={butlerType}
                  onEdit={scrollToTop}
                />
                
                {/* Submit button */}
                <div className="mt-6">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full h-14 text-base"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting
                      ? 'Submitting...'
                      : 'Submit Booking Request'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    No payment required now
                  </p>
                </div>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
