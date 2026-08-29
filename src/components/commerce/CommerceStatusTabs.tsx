import { AO_STATUT_LABELS, AO_STATUTS, type AoStatut } from "@/lib/commerceTypes";
import { AO_STATUT_STYLES } from "@/lib/aoStatusStyles";
import { cn } from "@/lib/utils";

export type AoStatutTab = "all" | AoStatut;

export function CommerceStatusTabs({
  active,
  counts,
  onChange,
}: {
  active: AoStatutTab;
  counts: Record<AoStatutTab, number>;
  onChange: (tab: AoStatutTab) => void;
}) {
  const tabs: Array<{ id: AoStatutTab; label: string; dot?: string }> = [
    { id: "all", label: "Tous" },
    ...AO_STATUTS.map((s) => ({
      id: s as AoStatutTab,
      label: AO_STATUT_LABELS[s],
      dot: AO_STATUT_STYLES[s].dot,
    })),
  ];

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
      <div className="flex w-max gap-1.5">
        {tabs.map((tab) => {
          const selected = active === tab.id;
          const count = counts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-pressed={selected}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-card text-muted-foreground hover:bg-muted/50",
              )}
            >
              {tab.dot ? (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    selected ? "bg-primary-foreground" : tab.dot,
                  )}
                />
              ) : null}
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  selected ? "bg-white/20" : "bg-muted text-foreground/70",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
