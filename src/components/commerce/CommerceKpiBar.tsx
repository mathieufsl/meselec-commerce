import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileText, Target, TrendingUp } from "lucide-react";

export type CommerceKpiKey = "pipeline" | "montant" | "gagnes";

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function CommerceKpiBar({
  pipelineCount,
  montantPipeline,
  gagnesCount,
  montantGagne,
  active,
  onToggle,
}: {
  pipelineCount: number;
  montantPipeline: number;
  gagnesCount: number;
  montantGagne: number;
  active: CommerceKpiKey | null;
  onToggle: (k: CommerceKpiKey) => void;
}) {
  const items: Array<{
    key: CommerceKpiKey;
    label: string;
    shortLabel: string;
    value: string;
    mobileValue: string;
    subtitle: string;
    valueClass: string;
    activeRing: string;
    mobileActive: string;
    icon: typeof FileText;
  }> = [
    {
      key: "pipeline",
      label: "Pipeline actif",
      shortLabel: "Pipeline",
      value: `${pipelineCount} AO`,
      mobileValue: String(pipelineCount),
      subtitle: "hors gagné / perdu / abandonné",
      valueClass: "text-blue-600 dark:text-blue-400",
      activeRing: "border-blue-500/70 bg-blue-500/5",
      mobileActive: "border-blue-600/80 bg-blue-600 text-white",
      icon: Target,
    },
    {
      key: "montant",
      label: "Montant pipeline",
      shortLabel: "Montant",
      value: `${fmt(montantPipeline)} € HT`,
      mobileValue: fmt(montantPipeline),
      subtitle: "estimé sur le pipeline",
      valueClass: "text-amber-600 dark:text-amber-400",
      activeRing: "border-amber-500/70 bg-amber-500/5",
      mobileActive: "border-amber-600/80 bg-amber-600 text-white",
      icon: TrendingUp,
    },
    {
      key: "gagnes",
      label: "Marchés gagnés",
      shortLabel: "Gagnés",
      value: `${fmt(montantGagne)} € HT`,
      mobileValue: fmt(montantGagne),
      subtitle: `${gagnesCount} marché${gagnesCount > 1 ? "s" : ""} signé${gagnesCount > 1 ? "s" : ""}`,
      valueClass: "text-emerald-600 dark:text-emerald-400",
      activeRing: "border-emerald-500/70 bg-emerald-500/5",
      mobileActive: "border-emerald-600/80 bg-emerald-600 text-white",
      icon: FileText,
    },
  ];

  return (
    <>
      {/* Mobile : 3 tuiles compactes */}
      <div className="grid grid-cols-3 gap-1.5 pb-2 md:hidden">
        {items.map((item) => {
          const selected = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggle(item.key)}
              aria-pressed={selected}
              className={cn(
                "min-w-0 rounded-lg border px-2 py-2 text-left transition-colors",
                selected ? item.mobileActive : "border-border/80 bg-card",
              )}
            >
              <p
                className={cn(
                  "truncate text-[10px] font-medium leading-tight",
                  selected ? "text-white/90" : "text-muted-foreground",
                )}
              >
                {item.shortLabel}
              </p>
              <p
                className={cn(
                  "mt-0.5 truncate text-sm font-bold tabular-nums leading-tight",
                  selected ? "text-white" : item.valueClass,
                )}
              >
                {item.mobileValue}
              </p>
            </button>
          );
        })}
      </div>

      {/* Desktop : cartes */}
      <div className="hidden min-w-0 grid-cols-3 gap-2 pb-2 md:grid">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggle(item.key)}
              aria-pressed={selected}
              className="min-w-0 text-left"
            >
              <Card
                className={cn(
                  "border shadow-sm transition-colors",
                  selected ? item.activeRing : "hover:bg-muted/30",
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                  <CardTitle className="truncate text-xs font-medium text-muted-foreground">
                    {item.label}
                  </CardTitle>
                  <Icon className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div
                    className={cn(
                      "text-lg font-bold tabular-nums leading-tight",
                      item.valueClass,
                    )}
                  >
                    {item.value}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.subtitle}</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </>
  );
}
