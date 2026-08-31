import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import type { AoDateFilterPreset } from "@/lib/aoFilters";
import { cn } from "@/lib/utils";
import { Calendar, X } from "lucide-react";

const PRESETS: Array<{ id: AoDateFilterPreset; label: string }> = [
  { id: "7j", label: "7 j" },
  { id: "30j", label: "30 j" },
  { id: "ce_mois", label: "Ce mois" },
  { id: "sans_date", label: "Sans date" },
];

export function CommerceAoDateFilters({
  dateMax,
  preset,
  onDateMaxChange,
  onPresetChange,
  onClear,
}: {
  dateMax: string;
  preset: AoDateFilterPreset | null;
  onDateMaxChange: (value: string) => void;
  onPresetChange: (value: AoDateFilterPreset | null) => void;
  onClear: () => void;
}) {
  const active = Boolean(preset || dateMax);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      <span className="hidden text-xs font-medium text-muted-foreground lg:inline">Échéance</span>
      {PRESETS.map((p) => (
        <Button
          key={p.id}
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            "h-9 shrink-0 px-2.5 text-xs font-normal",
            preset === p.id && "border-primary/40 bg-primary/10 text-primary",
          )}
          onClick={() => {
            onDateMaxChange("");
            onPresetChange(preset === p.id ? null : p.id);
          }}
        >
          {p.label}
        </Button>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "h-9 shrink-0 gap-1.5 px-2.5 text-xs font-normal",
              dateMax && "border-primary/40 bg-primary/10 text-primary",
            )}
          >
            <Calendar className="h-3.5 w-3.5 opacity-70" />
            Personnaliser
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <p className="mb-2 text-xs text-muted-foreground">Échéance max (inclus)</p>
          <Input
            type="date"
            value={dateMax}
            onChange={(e) => {
              onPresetChange(null);
              onDateMaxChange(e.target.value);
            }}
            className="h-9"
          />
        </PopoverContent>
      </Popover>

      {active ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" />
          Effacer
        </Button>
      ) : null}
    </div>
  );
}
