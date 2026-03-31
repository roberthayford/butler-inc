interface UsageGaugeProps {
  label: string;
  used: number;
  total: number;
  unit: string;
}

export function UsageGauge({ label, used, total, unit }: UsageGaugeProps) {
  const remaining = Math.max(0, total - used);
  const percentage = total > 0 ? (used / total) * 100 : 0;

  const fillColor =
    percentage >= 100
      ? "bg-red-500"
      : percentage >= 80
        ? "bg-amber-500"
        : "bg-brass";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-warm-gray">{label}</span>
        <span className="text-optical-white font-medium">
          {remaining} {unit} remaining
        </span>
      </div>
      <div className="h-2 bg-primary-foreground/10 rounded-sm overflow-hidden">
        <div
          data-testid="gauge-fill"
          className={`h-full rounded-sm transition-all ${fillColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
