import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TIME_BANDS, BUTLER_RATES, type ButlerTypeKey, type TimeBandKey } from '@/data/pricing-config';

interface TimeSelectionProps {
  butlerType: ButlerTypeKey;
}

/**
 * Duration options in hours
 */
const DURATION_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 2, label: '2 hours' },
  { value: 3, label: '3 hours' },
  { value: 4, label: '4 hours (Half day)' },
  { value: 8, label: '8 hours (Full day)' },
] as const;

/**
 * TimeSelection component
 * 
 * Date picker (future dates only)
 * Time band radio group with prices shown inline
 * Duration dropdown
 * Clean, luxury design matching brand aesthetic
 */
export function TimeSelection({ butlerType }: TimeSelectionProps) {
  // Get rates for this butler type (bespoke excluded)
  const rates = butlerType !== 'bespoke' ? BUTLER_RATES[butlerType] : null;

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <p className="text-brass font-medium uppercase tracking-widest text-xs mb-3">
          Schedule
        </p>
        <h3 className="font-serif text-xl font-medium">
          When do you need service?
        </h3>
      </div>

      {/* Date picker */}
      <FormField
        name="date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-sm font-medium">Service Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-12',
                      !field.value && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 text-brass" />
                    {field.value ? (
                      format(new Date(field.value), 'EEEE, d MMMM yyyy')
                    ) : (
                      <span>Select a date</span>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(selectedDate) => {
                    if (selectedDate) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const selected = new Date(selectedDate);
                      selected.setHours(0, 0, 0, 0);

                      if (selected >= today) {
                        field.onChange(selectedDate.toISOString());
                      }
                    }
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Time band selection */}
      <FormField
        name="timeBand"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel className="text-sm font-medium">Time Band</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="space-y-3"
              >
                {(['offPeak', 'standard', 'premium'] as const).map((band) => {
                  const bandInfo = TIME_BANDS[band];
                  const rate = rates?.[band];

                  return (
                    <label
                      key={band}
                      htmlFor={band}
                      className={cn(
                        'flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all duration-200',
                        field.value === band
                          ? 'border-brass bg-ivory'
                          : 'border-border bg-background hover:border-brass/40',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={band} id={band} />
                        <div>
                          <span className="font-medium block">
                            {bandInfo.label}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {bandInfo.times}
                          </span>
                        </div>
                      </div>
                      {rate && (
                        <span className="font-serif text-lg font-medium text-brass">
                          £{rate}/hr
                        </span>
                      )}
                    </label>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Duration selection */}
      <FormField
        name="duration"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Estimated Duration</FormLabel>
            <Select
              onValueChange={(value) => field.onChange(Number(value))}
              value={field.value?.toString()}
            >
              <FormControl>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
