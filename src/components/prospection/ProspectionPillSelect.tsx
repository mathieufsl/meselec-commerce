import { memo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type PillOption<T extends string> = { value: T; label: string };

/** Pastille de valeur (style Notion) : texte complet, couleur douce, pas de bordure. */
export function Pill({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight",
        className,
      )}
      title={label}
    >
      {label}
    </span>
  );
}

/** Cellule « select » façon Notion : la valeur s'affiche en pastille, un clic ouvre la liste des choix. */
function PillSelectInner<T extends string>({
  value,
  options,
  pillClass,
  onChange,
  emptyLabel = "—",
}: {
  value: T;
  options: PillOption<T>[];
  pillClass: (value: T) => string;
  onChange: (value: T) => void;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const isEmpty = !value || !current;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 w-full min-w-0 items-center rounded-md px-1 text-left transition-colors hover:bg-muted/70",
            open && "bg-muted/70",
          )}
        >
          {isEmpty ? (
            <span className="px-1 text-xs text-muted-foreground/50">{emptyLabel}</span>
          ) : (
            <Pill label={current.label} className={pillClass(value)} />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value || "__empty__"}
              type="button"
              onClick={() => {
                if (!selected) onChange(o.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
            >
              {o.value ? (
                <Pill label={o.label} className={pillClass(o.value)} />
              ) : (
                <span className="text-xs text-muted-foreground">Non renseigné</span>
              )}
              {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export const PillSelect = memo(PillSelectInner) as typeof PillSelectInner;
