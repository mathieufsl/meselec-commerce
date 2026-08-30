import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AoDateFilterPreset } from "@/lib/aoFilters";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const PRESETS: Array<{ id: AoDateFilterPreset; label: string }> = [
  { id: "7j", label: "7 j" },
  { id: "30j", label: "30 j" },
  { id: "ce_mois", label: "Ce mois" },
  { id: "sans_date", label: "Sans date" },
];

export function CommerceAoDateFilters({
  dateFrom,
  dateTo,
  preset,
  onDateFromChange,
  onDateToChange,
  onPresetChange,
  onClear,
}: {
  dateFrom: string;
  dateTo: string;
  preset: AoDateFilterPreset | null;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onPresetChange: (value: AoDateFilterPreset | null) => void;
  onClear: () => void;
}) {
  const active = Boolean(preset || dateFrom || dateTo);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-2 py-1">
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Échéance
        </span>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            onPresetChange(null);
            onDateFromChange(e.target.value);
          }}
          className="h-7 w-[7.5rem] border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
          aria-label="Date limite à partir du"
        />
        <span className="text-[10px] text-muted-foreground">→</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            onPresetChange(null);
            onDateToChange(e.target.value);
          }}
          className="h-7 w-[7.5rem] border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
          aria-label="Date limite jusqu'au"
        />
      </div>

      <div className="-mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={preset === p.id ? "default" : "outline"}
            className={cn(
              "h-7 shrink-0 px-2.5 text-[11px]",
              preset === p.id && "shadow-sm",
            )}
            onClick={() => onPresetChange(preset === p.id ? null : p.id)}
          >
            {p.label}
          </Button>
        ))}
        {active ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 shrink-0 gap-1 px-2 text-[11px] text-muted-foreground"
            onClick={onClear}
          >
            <X className="h-3 w-3" />
            Effacer
          </Button>
        ) : null}
      </div>
    </div>
  );
}
