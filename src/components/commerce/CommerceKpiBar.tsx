import { cn } from "@/lib/utils";
import { FileText, TrendingUp, Target } from "lucide-react";

export type CommerceKpiKey = "pipeline" | "montant" | "gagnes";

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const compact = (n: number) =>
  n >= 1000
    ? `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: n >= 10000 ? 0 : 1 })} k`
    : fmt(n);

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
    value: string;
    valueMobile: string;
    sub: string;
    accent: string;
    ring: string;
    icon: typeof FileText;
  }> = [
    {
      key: "pipeline",
      label: "Pipeline actif",
      value: String(pipelineCount),
      valueMobile: String(pipelineCount),
      sub: "appels d'offres",
      accent: "text-sky-600 dark:text-sky-400",
      ring: "border-sky-500/60 bg-sky-500/[0.06]",
      icon: Target,
    },
    {
      key: "montant",
      label: "Montant pipeline",
      value: `${fmt(montantPipeline)} € HT`,
      valueMobile: `${compact(montantPipeline)} €`,
      sub: "estimé",
      accent: "text-amber-600 dark:text-amber-400",
      ring: "border-amber-500/60 bg-amber-500/[0.06]",
      icon: TrendingUp,
    },
    {
      key: "gagnes",
      label: "Marchés gagnés",
      value: `${fmt(montantGagne)} € HT`,
      valueMobile: `${compact(montantGagne)} €`,
      sub: `${gagnesCount} affaire(s)`,
      accent: "text-emerald-600 dark:text-emerald-400",
      ring: "border-emerald-500/60 bg-emerald-500/[0.06]",
      icon: FileText,
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-3 gap-1.5 pb-2 sm:gap-2 md:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onToggle(item.key)}
            aria-pressed={selected}
            className={cn(
              "min-w-0 rounded-xl border border-border/70 bg-card px-2.5 py-2 text-left shadow-sm transition-all active:scale-[0.99] sm:px-3 sm:py-2.5",
              selected ? item.ring : "hover:border-border hover:bg-muted/30",
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                {item.label}
              </span>
              <Icon className={cn("h-3 w-3 shrink-0", item.accent)} />
            </div>
            <div
              className={cn(
                "mt-1 truncate text-base font-bold leading-tight tabular-nums sm:text-lg",
                item.accent,
              )}
            >
              <span className="sm:hidden">{item.valueMobile}</span>
              <span className="hidden sm:inline">{item.value}</span>
            </div>
            <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">{item.sub}</p>
          </button>
        );
      })}
    </div>
  );
}
