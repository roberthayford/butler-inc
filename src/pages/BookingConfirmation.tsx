import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle } from 'lucide-react';

interface BookingConfirmationState {
  reference: string;
  booking: any;
  pricing: {
    total: number;
    baseRate: number;
    hours: number;
    subtotal: number;
    surcharges: {
      cambridge?: number;
    };
  };
}

/**
 * BookingConfirmation page
 * 
 * Success page shown after booking submission
 * Clean, luxury design matching brand aesthetic
 */
export default function BookingConfirmation() {
  const location = useLocation();
  const state = location.state as BookingConfirmationState | null;

  // Fallback if accessed directly without state
  if (!state) {
    return (
      <div className="min-h-screen bg-cream py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="font-serif text-3xl font-medium mb-4">
            Booking Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            No booking information found. Please start a new booking.
          </p>
          <Button asChild>
            <Link to="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { reference, pricing } = state;

  return (
    <div className="min-h-screen bg-cream py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-xl mx-auto">
        {/* Success icon and header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage-light mb-6">
            <CheckCircle className="w-8 h-8 text-sage" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-medium mb-3">
            Booking Request Received
          </h1>
          <p className="text-muted-foreground">
            We'll be in touch shortly to confirm your service
          </p>
        </div>

        {/* Booking reference */}
        <div className="p-6 rounded-xl bg-ivory border border-brass/10 text-center mb-8">
          <p className="text-brass font-medium uppercase tracking-widest text-xs mb-2">
            Booking Reference
          </p>
          <p className="font-mono text-2xl font-medium">
            {reference}
          </p>
        </div>

        {/* What happens next */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-medium mb-6">
            What happens next?
          </h2>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-sage-light text-sage flex items-center justify-center text-sm font-medium">
                1
              </span>
              <div>
                <p className="font-medium mb-1">Review & confirmation</p>
                <p className="text-sm text-muted-foreground">
                  We'll review your request and confirm availability within 2 hours
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-sage-light text-sage flex items-center justify-center text-sm font-medium">
                2
              </span>
              <div>
                <p className="font-medium mb-1">Butler assignment</p>
                <p className="text-sm text-muted-foreground">
                  You'll receive a confirmation email with your butler's details
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-sage-light text-sage flex items-center justify-center text-sm font-medium">
                3
              </span>
              <div>
                <p className="font-medium mb-1">Payment</p>
                <p className="text-sm text-muted-foreground">
                  Payment details will be sent before your scheduled service
                </p>
              </div>
            </li>
          </ol>
        </div>

        <Separator className="mb-8" />

        {/* Estimated total */}
        {pricing && (
          <div className="p-6 rounded-xl bg-background border border-border mb-8">
            <p className="text-muted-foreground text-sm mb-2">
              Estimated Total
            </p>
            <p className="font-serif text-3xl font-medium text-brass">
              £{pricing.total.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Final price confirmed before payment
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4">
          <Button variant="outline" asChild className="flex-1 h-12">
            <Link to="/">Return Home</Link>
          </Button>
          <Button asChild className="flex-1 h-12">
            <a href={`mailto:bookings@butlersinc.com?subject=Booking ${reference}`}>
              Contact Us
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
