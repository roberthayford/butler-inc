import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { detectCambridgeSurcharge, LOCATION_SURCHARGES } from '@/data/pricing-config';

/**
 * LocationInput component
 * 
 * UK postcode validation with regex
 * Cambridge detection with surcharge notification
 * Clean, luxury design matching brand aesthetic
 */
export function LocationInput() {
  const { watch } = useFormContext();
  const postcode = watch('postcode') || '';

  const isCambridge = postcode ? detectCambridgeSurcharge(postcode) : false;

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <p className="text-brass font-medium uppercase tracking-widest text-xs mb-3">
          Location
        </p>
        <h3 className="font-serif text-xl font-medium mb-2">
          Where is the service needed?
        </h3>
        <p className="text-sm text-muted-foreground">
          We'll use this to calculate any travel surcharges
        </p>
      </div>

      <div className="space-y-4">
        {/* Postcode */}
        <FormField
          name="postcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Postcode</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., SW1A 1AA"
                  className="uppercase h-12"
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cambridge surcharge notice */}
        {isCambridge && (
          <div className="p-4 rounded-xl bg-sage-light/20 border border-sage/10">
            <p className="text-sm">
              <span className="font-medium text-sage">Travel surcharge applies</span>
              <span className="text-muted-foreground">
                {' '}— +£{LOCATION_SURCHARGES.cambridge.amount} one-time fee from Cambridge base
              </span>
            </p>
          </div>
        )}

        {/* Address line 1 */}
        <FormField
          name="addressLine1"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Address Line 1</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Street address, building number"
                  className="h-12"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address line 2 (optional) */}
        <FormField
          name="addressLine2"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                Address Line 2
                <span className="text-muted-foreground font-normal ml-2">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Apartment, suite, unit, etc."
                  className="h-12"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Access instructions (optional) */}
        <FormField
          name="accessInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                Access Instructions
                <span className="text-muted-foreground font-normal ml-2">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Gate codes, parking information, entry instructions..."
                  className="min-h-[80px] resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
