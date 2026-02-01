import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { BUTLER_TASKS } from '@/data/butler-tasks';
import type { ButlerTypeKey } from '@/data/pricing-config';

interface TaskSelectionProps {
  butlerType: ButlerTypeKey;
}

/**
 * TaskSelection component
 * 
 * Displays checkbox options for predefined tasks
 * Includes "Other" option with conditional textarea
 * Clean, luxury design matching brand aesthetic
 */
export function TaskSelection({ butlerType }: TaskSelectionProps) {
  const { watch, setValue } = useFormContext();
  const selectedTasks = watch('tasks') || [];
  const customTask = watch('customTask') || '';
  const showOther = watch('showOther') || false;

  const tasks = BUTLER_TASKS[butlerType];

  // Bespoke butler uses free-text only
  if (butlerType === 'bespoke') {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-brass font-medium uppercase tracking-widest text-xs mb-3">
            Your Request
          </p>
          <h3 className="font-serif text-xl font-medium mb-2">
            What do you need?
          </h3>
          <p className="text-sm text-muted-foreground">
            Please describe your request in detail
          </p>
        </div>

        <FormField
          name="customTask"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Describe your custom request..."
                  maxLength={500}
                  className="min-h-[120px] resize-none"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-2">
                {field.value?.length || 0}/500 characters
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-sm text-muted-foreground">
          Complex requests require a manual quote. Our team will review and respond within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <p className="text-brass font-medium uppercase tracking-widest text-xs mb-3">
          Service
        </p>
        <h3 className="font-serif text-xl font-medium mb-2">
          What do you need?
        </h3>
        <p className="text-sm text-muted-foreground">
          Select all that apply
        </p>
      </div>

      {/* Predefined tasks */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <FormField
            key={task.id}
            name="tasks"
            render={() => (
              <label
                htmlFor={task.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background cursor-pointer transition-all duration-200 hover:border-brass/40"
              >
                <FormControl>
                  <Checkbox
                    id={task.id}
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setValue('tasks', [...selectedTasks, task.id], {
                          shouldValidate: true,
                        });
                      } else {
                        setValue(
                          'tasks',
                          selectedTasks.filter((id: string) => id !== task.id),
                          { shouldValidate: true },
                        );
                      }
                    }}
                    className="data-[state=checked]:bg-brass data-[state=checked]:border-brass"
                  />
                </FormControl>
                <FormLabel
                  htmlFor={task.id}
                  className="font-normal cursor-pointer flex-1"
                >
                  {task.label}
                </FormLabel>
              </label>
            )}
          />
        ))}

        {/* Other option */}
        <FormField
          name="showOther"
          render={({ field }) => (
            <div className="space-y-3">
              <label
                htmlFor="other-task"
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background cursor-pointer transition-all duration-200 hover:border-brass/40"
              >
                <FormControl>
                  <Checkbox
                    id="other-task"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (!checked) {
                        setValue('customTask', '');
                      }
                    }}
                    className="data-[state=checked]:bg-brass data-[state=checked]:border-brass"
                  />
                </FormControl>
                <FormLabel
                  htmlFor="other-task"
                  className="font-normal cursor-pointer flex-1"
                >
                  Other
                </FormLabel>
              </label>

              {field.value && (
                <FormField
                  name="customTask"
                  render={({ field: textField }) => (
                    <FormItem className="pl-4">
                      <FormControl>
                        <Textarea
                          {...textField}
                          placeholder="Please describe what you need..."
                          maxLength={500}
                          className="min-h-[80px] resize-none"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {textField.value?.length || 0}/500 characters
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}
