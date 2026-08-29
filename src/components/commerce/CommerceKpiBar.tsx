import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileText, TrendingUp, Target } from "lucide-react";

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
    value: string;
    sub: string;
    color: string;
    activeBorder: string;
    icon: typeof FileText;
  }> = [
    {
      key: "pipeline",
      label: "Pipeline actif",
      value: String(pipelineCount),
      sub: "appels d'offres",
      color: "text-blue-600 dark:text-blue-400",
      activeBorder: "border-blue-500/70 bg-blue-500/5",
      icon: Target,
    },
    {
      key: "montant",
      label: "Montant pipeline",
      value: `${fmt(montantPipeline)} € HT`,
      sub: "estimé",
      color: "text-amber-600 dark:text-amber-400",
      activeBorder: "border-amber-500/70 bg-amber-500/5",
      icon: TrendingUp,
    },
    {
      key: "gagnes",
      label: "Marchés gagnés",
      value: `${fmt(montantGagne)} € HT`,
      sub: `${gagnesCount} affaire(s)`,
      color: "text-green-600 dark:text-green-400",
      activeBorder: "border-emerald-500/70 bg-emerald-500/5",
      icon: FileText,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 pb-2 md:grid-cols-3 min-w-0">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onToggle(item.key)}
            aria-pressed={active === item.key}
            className="text-left"
          >
            <Card
              className={cn(
                "border shadow-sm transition-colors",
                active === item.key && item.activeBorder,
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {item.label}
                </CardTitle>
                <Icon className="h-3 w-3 text-muted-foreground/80" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className={cn("text-lg font-bold tabular-nums leading-tight", item.color)}>
                  {item.value}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.sub}</p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
