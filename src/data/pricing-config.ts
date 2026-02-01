/**
 * Pricing configuration for Butlers Inc. reservation system
 * 
 * Defines hourly rates by butler type and time band, plus location surcharges.
 * All rates are in GBP (£).
 */

export type TimeBandKey = 'offPeak' | 'standard' | 'premium';
export type ButlerTypeKey = 'busy' | 'baby' | 'bougie' | 'base' | 'budget' | 'bespoke';

/**
 * Hourly rates for each butler type by time band
 * Bespoke butler rates are custom quotes, so excluded from this structure
 */
export const BUTLER_RATES: Record<Exclude<ButlerTypeKey, 'bespoke'>, Record<TimeBandKey, number>> = {
  busy: { offPeak: 35, standard: 45, premium: 60 },
  baby: { offPeak: 40, standard: 50, premium: 65 },
  bougie: { offPeak: 65, standard: 80, premium: 100 },
  base: { offPeak: 28, standard: 35, premium: 50 },
  budget: { offPeak: 18, standard: 20, premium: 30 },
};

/**
 * Time band definitions with labels, time ranges, and descriptions
 */
export const TIME_BANDS: Record<TimeBandKey, { label: string; times: string; description: string }> = {
  offPeak: {
    label: 'Off-Peak',
    times: '6:00am - 9:00am',
    description: 'Save on early morning services',
  },
  standard: {
    label: 'Standard',
    times: '9:00am - 6:00pm',
    description: 'Regular daytime rates',
  },
  premium: {
    label: 'Premium',
    times: '6:00pm - 10:00pm',
    description: 'Evening service premium',
  },
};

/**
 * Location-based surcharges
 * Applied as one-time fees based on postcode detection
 */
export const LOCATION_SURCHARGES = {
  cambridge: {
    postcodePrefix: 'CB',
    label: 'Cambridge origin',
    amount: 50,
    description: 'One-time travel surcharge from Cambridge base',
  },
} as const;

/**
 * Additional hourly rate for body-cam streaming
 * Only available for Baby and Base butlers
 */
export const BODYCAM_RATE = 10;

/**
 * Helper function to detect if a postcode triggers a surcharge
 */
export const detectCambridgeSurcharge = (postcode: string): boolean => {
  return postcode.toUpperCase().trim().startsWith(LOCATION_SURCHARGES.cambridge.postcodePrefix);
};
