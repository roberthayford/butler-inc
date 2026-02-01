import { useFormContext } from 'react-hook-form';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { TIME_BANDS, BUTLER_RATES, detectCambridgeSurcharge, LOCATION_SURCHARGES, type ButlerTypeKey, type TimeBandKey } from '@/data/pricing-config';
import { services } from '@/data/services';
import { BUTLER_TASKS } from '@/data/butler-tasks';

interface BookingSummaryProps {
  butlerType: ButlerTypeKey;
  onEdit?: () => void;
}

/**
 * BookingSummary component
 * 
 * Pre-submit review showing all selections
 * Clean, luxury design matching brand aesthetic
 */
export function BookingSummary({ butlerType, onEdit }: BookingSummaryProps) {
  const { watch } = useFormContext();

  const tasks = watch('tasks') || [];
  const customTask = watch('customTask') || '';
  const showOther = watch('showOther') || false;
  const date = watch('date');
  const timeBand = watch('timeBand') as TimeBandKey | undefined;
  const duration = watch('duration') as number | undefined;
  const postcode = watch('postcode') || '';
  const addressLine1 = watch('addressLine1') || '';
  const name = watch('name') || '';
  const email = watch('email') || '';

  const service = services.find((s) => s.id === butlerType);
  const isCambridge = postcode ? detectCambridgeSurcharge(postcode) : false;

  // Calculate pricing
  let total = 0;
  let hourlyRate = 0;
  if (timeBand && duration && butlerType !== 'bespoke') {
    const rates = BUTLER_RATES[butlerType];
    hourlyRate = rates[timeBand];
    const subtotal = hourlyRate * duration;
    const cambridgeSurcharge = isCambridge
      ? LOCATION_SURCHARGES.cambridge.amount
      : 0;
    total = subtotal + cambridgeSurcharge;
  }

  // Get selected task labels
  const selectedTaskLabels: string[] = [];
  if (butlerType === 'bespoke') {
    if (customTask) {
      selectedTaskLabels.push(customTask);
    }
  } else {
    const taskList = BUTLER_TASKS[butlerType];
    tasks.forEach((taskId: string) => {
      const task = taskList.find((t) => t.id === taskId);
      if (task) {
        selectedTaskLabels.push(task.label);
      }
    });
    if (showOther && customTask) {
      selectedTaskLabels.push(`Other: ${customTask}`);
    }
  }

  // Only show summary when form has key fields filled
  const hasRequiredFields =
    (tasks.length > 0 || customTask) &&
    date &&
    timeBand &&
    duration &&
    postcode &&
    addressLine1 &&
    name &&
    email;

  if (!hasRequiredFields) {
    return null;
  }

  return (
    <div className="mt-6 p-6 rounded-xl bg-background border border-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-brass font-medium uppercase tracking-widest text-xs mb-1">
            Review
          </p>
          <h3 className="font-serif text-lg font-medium">
            Your Booking
          </h3>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm text-brass hover:text-brass/80 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      <div className="space-y-4 text-sm">
        {/* Service */}
        <div>
          <p className="text-muted-foreground mb-1">Service</p>
          <p className="font-medium">{service?.name || 'Butler'}</p>
        </div>

        {/* Tasks */}
        {selectedTaskLabels.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1">
              {selectedTaskLabels.length > 1 ? 'Tasks' : 'Task'}
            </p>
            <ul className="space-y-1">
              {selectedTaskLabels.map((label, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-brass mt-0.5">–</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Date & Time */}
        {date && timeBand && (
          <div>
            <p className="text-muted-foreground mb-1">When</p>
            <p>
              {format(new Date(date), 'EEEE, d MMMM yyyy')}
              <span className="text-muted-foreground">
                {' '}· {TIME_BANDS[timeBand].label}
              </span>
            </p>
          </div>
        )}

        {/* Duration */}
        {duration && (
          <div>
            <p className="text-muted-foreground mb-1">Duration</p>
            <p>{duration} {duration === 1 ? 'hour' : 'hours'}</p>
          </div>
        )}

        {/* Location */}
        <div>
          <p className="text-muted-foreground mb-1">Location</p>
          <p>{postcode}{addressLine1 && `, ${addressLine1}`}</p>
        </div>

        {/* Pricing */}
        {butlerType !== 'bespoke' && total > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  £{hourlyRate}/hr × {duration} {duration === 1 ? 'hour' : 'hours'}
                </span>
                <span>£{(hourlyRate * duration).toFixed(2)}</span>
              </div>
              {isCambridge && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cambridge surcharge</span>
                  <span>£{LOCATION_SURCHARGES.cambridge.amount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className="text-brass">£{total.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        {butlerType === 'bespoke' && (
          <>
            <Separator />
            <p className="text-muted-foreground text-center">
              Custom quote will be provided within 24 hours
            </p>
          </>
        )}
      </div>
    </div>
  );
}
