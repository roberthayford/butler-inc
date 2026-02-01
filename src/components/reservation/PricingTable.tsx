import { BUTLER_RATES, TIME_BANDS, LOCATION_SURCHARGES, type ButlerTypeKey } from '@/data/pricing-config';
import { services } from '@/data/services';

interface PricingTableProps {
  butlerType: ButlerTypeKey;
}

/**
 * PricingTable component
 * 
 * Displays all three time bands (Off-Peak, Standard, Premium) with rates
 * Clean, text-only luxury design matching brand aesthetic
 */
export function PricingTable({ butlerType }: PricingTableProps) {
  // Bespoke butler doesn't have fixed rates
  if (butlerType === 'bespoke') {
    return null;
  }

  const rates = BUTLER_RATES[butlerType];
  const service = services.find((s) => s.id === butlerType);

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div>
        <p className="text-brass font-medium uppercase tracking-widest text-xs mb-3">
          Pricing
        </p>
        <h2 className="font-serif text-2xl md:text-3xl font-medium mb-2">
          {service?.name || 'Butler'} Rates
        </h2>
        <p className="text-muted-foreground">
          Transparent pricing based on time of day
        </p>
      </div>

      {/* Time band pricing grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['offPeak', 'standard', 'premium'] as const).map((band, index) => {
          const bandInfo = TIME_BANDS[band];
          const rate = rates[band];
          const isStandard = band === 'standard';

          return (
            <div
              key={band}
              className={`p-6 rounded-xl border transition-all duration-300 ${
                isStandard
                  ? 'bg-ivory border-brass/20 shadow-sm'
                  : 'bg-background border-border hover:border-brass/30'
              }`}
            >
              {/* Time band label */}
              <div className="mb-4">
                <h3 className="font-serif text-lg font-medium mb-1">
                  {bandInfo.label}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  {bandInfo.times}
                </p>
              </div>

              {/* Price */}
              <div className="mb-3">
                <span className="font-serif text-3xl font-medium text-brass">
                  £{rate}
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  /hour
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground">
                {bandInfo.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Location surcharges note */}
      <div className="p-5 rounded-xl bg-sage-light/20 border border-sage/10">
        <p className="text-sm">
          <span className="font-medium text-sage">Travel surcharge</span>
          <span className="text-muted-foreground">
            {' '}— Cambridge origin: +£{LOCATION_SURCHARGES.cambridge.amount} one-time fee
          </span>
        </p>
      </div>
    </div>
  );
}
