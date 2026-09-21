import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  gestionLegendItems,
  prestataireColor,
  statutLegendItems,
  UNSET_COLOR,
} from "@/lib/prospection/mapColors";
import type { PrestataireStat } from "@/lib/prospection/mapStats";
import { formatPercent } from "@/lib/prospection/mapStats";
import type { ProspectionMapColorMode } from "@/lib/prospection/mapTypes";
import { STATUS_OPTIONS } from "@/lib/prospection/ui";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

type Props = {
  colorMode: ProspectionMapColorMode;
  prestataireStats: PrestataireStat[];
  highlightedPrestataires: Set<string>;
  onTogglePrestataire: (name: string, multi: boolean) => void;
  onClearHighlight: () => void;
  companySearch: string;
  onCompanySearchChange: (value: string) => void;
};

function LegendSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 rounded-full border border-white shadow-sm"
      style={{ backgroundColor: color }}
    />
  );
}

export function ProspectionCartesLegend({
  colorMode,
  prestataireStats,
  highlightedPrestataires,
  onTogglePrestataire,
  onClearHighlight,
  companySearch,
  onCompanySearchChange,
}: Props) {
  if (colorMode === "prestataire") {
    const q = companySearch.trim().toLowerCase();
    const filtered = q
      ? prestataireStats.filter((s) => s.name.toLowerCase().includes(q))
      : prestataireStats;

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-border/60 px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Entreprises</h3>
            {highlightedPrestataires.size > 0 ? (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={onClearHighlight}
              >
                Tout afficher
              </button>
            ) : null}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={companySearch}
              onChange={(e) => onCompanySearchChange(e.target.value)}
              placeholder="Rechercher une entreprise…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Cliquez pour surligner · Ctrl+clic pour comparer
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                Aucune entreprise renseignée
              </p>
            ) : (
              filtered.map((stat) => {
                const selected = highlightedPrestataires.has(stat.name);
                return (
                  <button
                    key={stat.name}
                    type="button"
                    onClick={(e) => onTogglePrestataire(stat.name, e.metaKey || e.ctrlKey)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted",
                      selected && "bg-primary/10 ring-1 ring-primary/30",
                    )}
                  >
                    <LegendSwatch color={prestataireColor(stat.name)} />
                    <span className="min-w-0 flex-1 truncate font-medium">{stat.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {stat.count} · {formatPercent(stat.percent)}%
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  const items =
    colorMode === "gestion"
      ? gestionLegendItems()
      : statutLegendItems().map((item) => ({
          label: STATUS_OPTIONS.find((o) => o.value === item.label)?.label ?? item.label,
          color: item.color,
        }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/60 px-3 py-3">
        <h3 className="text-sm font-semibold">Légende</h3>
      </div>
      <div className="space-y-1 p-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <LegendSwatch color={item.color} />
            <span>{item.label}</span>
          </div>
        ))}
        {colorMode === "gestion" ? (
          <div className="flex items-center gap-2 text-sm">
            <LegendSwatch color={UNSET_COLOR} />
            <span>Non renseigné</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
