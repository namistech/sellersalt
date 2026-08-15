import { DataText, Caption } from "@/components/ui";

// Custom Recharts tooltip content — replaces Recharts' default
// browser-native-looking tooltip with one built from our own tokens
// (design-system-v1.md §14: "tooltips... using the Data Display number-
// formatting rules"). Recharts calls this with {active, label, payload}.

export interface ChartTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: ChartTooltipPayloadItem[];
  valueFormatter?: (value: number | string) => string;
}

export function ChartTooltip({ active, label, payload, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-sm border border-line bg-surface px-3 py-2 shadow-sm">
      {label !== undefined && (
        <Caption className="mb-1 block text-ink-secondary">{label}</Caption>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <Caption className="text-ink-secondary">{item.name}</Caption>
            <DataText size="data-sm">{valueFormatter && item.value !== undefined ? valueFormatter(item.value) : item.value}</DataText>
          </div>
        ))}
      </div>
    </div>
  );
}
