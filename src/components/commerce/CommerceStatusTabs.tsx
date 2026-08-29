import { AO_STATUT_LABELS, AO_STATUTS, type AoStatut } from "@/lib/commerceTypes";
import { cn } from "@/lib/utils";

export type AoStatutTab = "all" | AoStatut;

const TAB_STYLES: Record<AoStatut, string> = {
  veille: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  analyse: "bg-violet-200 text-violet-900 dark:bg-violet-800 dark:text-violet-100",
  en_cours: "bg-sky-200 text-sky-900 dark:bg-sky-800 dark:text-sky-100",
  depose: "bg-cyan-200 text-cyan-900 dark:bg-cyan-800 dark:text-cyan-100",
  gagne: "bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100",
  perdu: "bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100",
  abandonne: "bg-neutral-300 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-100",
};

export function CommerceStatusTabs({
  active,
  counts,
  onChange,
}: {
  active: AoStatutTab;
  counts: Record<AoStatutTab, number>;
  onChange: (tab: AoStatutTab) => void;
}) {
  const tabs: Array<{ id: AoStatutTab; label: string; className?: string }> = [
    { id: "all", label: "Tous", className: "bg-primary text-primary-foreground" },
    ...AO_STATUTS.map((s) => ({
      id: s as AoStatutTab,
      label: AO_STATUT_LABELS[s],
      className: TAB_STYLES[s],
    })),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const selected = active === tab.id;
        const count = counts[tab.id] ?? 0;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-opacity",
              tab.className ?? "bg-muted text-foreground",
              !selected && "opacity-55 hover:opacity-90",
              selected && "ring-2 ring-offset-1 ring-primary/40 opacity-100",
            )}
          >
            {tab.label}
            <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
