import { memo } from "react";
import {
  PROSPECTION_RESPONSABLES,
  responsableBadgeClass,
  toggleResponsable,
} from "@/lib/prospection/responsables";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

export function ResponsableBadges({ value, className }: { value: string[]; className?: string }) {
  if (value.length === 0) return null;
  return (
    <span className={cn("flex min-w-0 flex-wrap gap-1", className)}>
      {value.map((name) => (
        <span
          key={name}
          className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none", responsableBadgeClass(name))}
        >
          {name}
        </span>
      ))}
    </span>
  );
}

/** Tableau : bouton compact + liste à cocher (plusieurs personnes). */
export const ProspectionResponsablesSelect = memo(function ProspectionResponsablesSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-full min-w-0 items-center justify-between gap-1 rounded-md border border-input bg-background px-2 text-left text-[10px] hover:bg-muted/50"
          title={value.length ? value.join(", ") : "Choisir qui s'en occupe"}
        >
          {value.length ? (
            <ResponsableBadges value={value} className="flex-nowrap overflow-hidden" />
          ) : (
            <span className="text-muted-foreground">?</span>
          )}
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {PROSPECTION_RESPONSABLES.map((name) => {
          const checked = value.includes(name);
          return (
            <label
              key={name}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox checked={checked} onCheckedChange={() => onChange(toggleResponsable(value, name))} />
              <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", responsableBadgeClass(name))}>
                {name}
              </span>
            </label>
          );
        })}
      </PopoverContent>
    </Popover>
  );
});

/** Fiche commune : boutons à bascule, visibles d'un coup d'œil (mobile compris). */
export function ProspectionResponsablesToggles({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROSPECTION_RESPONSABLES.map((name) => {
        const active = value.includes(name);
        return (
          <button
            key={name}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(toggleResponsable(value, name))}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
              active
                ? cn("border-transparent", responsableBadgeClass(name))
                : "border-input bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {active ? <Check className="h-3.5 w-3.5" /> : null}
            {name}
          </button>
        );
      })}
    </div>
  );
}
