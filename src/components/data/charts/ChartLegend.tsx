import { Text } from "@/components/ui";

// design-system-v1.md §14: "Legend required for 4+ series, positioned
// below the chart." Custom-rendered (not Recharts' default) so it
// matches our typography/spacing tokens.

export interface ChartLegendItem {
  label: string;
  color: string;
}

export interface ChartLegendProps {
  items: ChartLegendItem[];
}

export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <Text as="span" size="body-sm" color="secondary">
            {item.label}
          </Text>
        </span>
      ))}
    </div>
  );
}
