import { Badge } from "@/components/ui/badge";
import { CE_STATUT_LABELS, CE_STATUTS, type CeStatut } from "@/lib/commerceTypes";
import { CE_STATUT_STYLES } from "@/lib/ceStatusStyles";
import { cn } from "@/lib/utils";

export type CeStatutTab = "all" | CeStatut;

export function CeStatusTabs({
  active,
  counts,
  onChange,
  variant = "tabs",
}: {
  active: CeStatutTab;
  counts: Record<CeStatutTab, number>;
  onChange: (tab: CeStatutTab) => void;
  variant?: "tabs" | "chips";
}) {
  if (variant === "chips") {
    return (
      <div className="flex flex-wrap gap-1.5">
        <ChipButton
          selected={active === "all"}
          label="Tous"
          count={counts.all}
          onClick={() => onChange("all")}
        />
        {CE_STATUTS.map((statut) => (
          <ChipButton
            key={statut}
            selected={active === statut}
            label={CE_STATUT_LABELS[statut]}
            count={counts[statut]}
            dotClass={CE_STATUT_STYLES[statut].dot}
            badgeClass={CE_STATUT_STYLES[statut].badge}
            onClick={() => onChange(statut)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="-mx-1 flex flex-wrap gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <TabButton
        selected={active === "all"}
        label="Tous"
        count={counts.all}
        onClick={() => onChange("all")}
      />
      {CE_STATUTS.map((statut) => (
        <TabButton
          key={statut}
          selected={active === statut}
          label={CE_STATUT_LABELS[statut]}
          count={counts[statut]}
          badgeClass={CE_STATUT_STYLES[statut].badge}
          dotClass={CE_STATUT_STYLES[statut].dot}
          onClick={() => onChange(statut)}
        />
      ))}
    </div>
  );
}

function ChipButton({
  selected,
  label,
  count,
  dotClass,
  badgeClass,
  onClick,
}: {
  selected: boolean;
  label: string;
  count: number;
  dotClass?: string;
  badgeClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted/50",
      )}
    >
      {dotClass ? (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            selected ? "bg-primary-foreground" : dotClass,
          )}
        />
      ) : null}
      {label}
      <span
        className={cn(
          "rounded px-1 py-px text-[10px] font-semibold tabular-nums",
          selected
            ? "bg-primary-foreground/20 text-primary-foreground"
            : (badgeClass ?? "bg-muted text-muted-foreground"),
        )}
      >
        {count}
      </span>
    </button>
  );
}

function TabButton({
  selected,
  label,
  count,
  badgeClass,
  dotClass,
  onClick,
}: {
  selected: boolean;
  label: string;
  count: number;
  badgeClass?: string;
  dotClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-t-md px-4 py-2 text-sm font-medium transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {dotClass ? (
        <span className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-primary-foreground" : dotClass)} />
      ) : null}
      {label}
      <Badge
        variant={selected ? "secondary" : "outline"}
        className={cn("text-xs tabular-nums", !selected && badgeClass)}
      >
        {count}
      </Badge>
    </button>
  );
}
