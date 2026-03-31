"use client";

import { Label } from "@/components/ui/label";

interface TimePickerProps {
  label: string;
  slots: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimePicker({
  label,
  slots,
  value,
  onChange,
  disabled = false,
}: TimePickerProps) {
  if (slots.length === 0) {
    return (
      <div className="space-y-1.5">
        <Label className="text-optical-white text-sm">{label}</Label>
        <p className="text-warm-gray/60 text-sm py-2">No times available</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-optical-white text-sm">{label}</Label>
      <select
        role="combobox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2.5 rounded-sm bg-charcoal/50 border border-primary-foreground/20 text-optical-white text-sm appearance-none cursor-pointer focus-visible:outline-2 focus-visible:outline-brass disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:border-primary-foreground/30"
      >
        <option value="" disabled className="bg-charcoal text-warm-gray">
          Select time
        </option>
        {slots.map((slot) => (
          <option key={slot} value={slot} className="bg-charcoal text-optical-white">
            {slot}
          </option>
        ))}
      </select>
    </div>
  );
}
