import { useFormContext } from 'react-hook-form';
import { Separator } from '@/components/ui/separator';
import { BUTLER_RATES, detectCambridgeSurcharge, LOCATION_SURCHARGES, type ButlerTypeKey, type TimeBandKey } from '@/data/pricing-config';

interface PriceCalculatorProps {
  butlerType: ButlerTypeKey;
}

/**
 * PriceCalculator component
 * 
 * Real-time calculation: (rate × hours) + surcharges
 * Sticky card on desktop showing itemised breakdown
 * Clean, luxury design matching brand aesthetic
 */
export function PriceCalculator({ butlerType }: PriceCalculatorProps) {
  const { watch } = useFormContext();

  const timeBand = watch('timeBand') as TimeBandKey | undefined;
  const duration = watch('duration') as number | undefined;
  const postcode = watch('postcode') || '';

  // Bespoke butler doesn't have fixed pricing
  if (butlerType === 'bespoke') {
    return (
      <div className="sticky top-24 p-6 rounded-xl bg-ivory border border-brass/10">
        <p className="text-brass font-medium uppercase tracking-widest text-xs mb-3">
          Pricing
        </p>
        <h3 className="font-serif text-lg font-medium mb-3">
          Custom Quote Required
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Our team will review your request and provide a tailored quote within 24 hours.
        </p>
      </div>
    );
  }

  // Check if we have enough info to calculate
  const canCalculate = timeBand && duration && duration > 0;

  if (!canCalculate) {
    return (
      <div className="sticky top-24 p-6 rounded-xl bg-background border border-border">
        <p className="text-brass font-medium uppercase tracking-widest text-xs mb-3">
          Pricing
        </p>
        <h3 className="font-serif text-lg font-medium mb-3">
          Your Estimate
        </h3>
        <p className="text-sm text-muted-foreground">
          Select time band and duration to see pricing
        </p>
      </div>
    );
  }

  // Calculate pricing
  const rates = BUTLER_RATES[butlerType];
  const hourlyRate = rates[timeBand];
  const subtotal = hourlyRate * duration;
  const isCambridge = detectCambridgeSurcharge(postcode);
  const cambridgeSurcharge = isCambridge
    ? LOCATION_SURCHARGES.cambridge.amount
    : 0;
  const total = subtotal + cambridgeSurcharge;

  return (
    <div className="sticky top-24 p-6 rounded-xl bg-ivory border border-brass/10">
      <p className="text-brass font-medium uppercase tracking-widest text-xs mb-3">
        Pricing
      </p>
      <h3 className="font-serif text-lg font-medium mb-4">
        Your Estimate
      </h3>

      <div className="space-y-3">
        {/* Base rate calculation */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            £{hourlyRate}/hr × {duration} {duration === 1 ? 'hour' : 'hours'}
          </span>
          <span className="font-medium">£{subtotal.toFixed(2)}</span>
        </div>

        {/* Surcharges */}
        {cambridgeSurcharge > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Cambridge surcharge
            </span>
            <span className="font-medium">£{cambridgeSurcharge.toFixed(2)}</span>
          </div>
        )}

        <Separator className="my-4" />

        {/* Total */}
        <div className="flex justify-between items-baseline">
          <span className="font-medium">Total</span>
          <span className="font-serif text-2xl font-medium text-brass">
            £{total.toFixed(2)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          Final price confirmed before payment
        </p>
      </div>
    </div>
  );
}
