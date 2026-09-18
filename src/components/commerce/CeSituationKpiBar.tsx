import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CE_SITUATION_LABELS,
  CE_SITUATIONS,
  type CeDossier,
  type CeSituationJuridique,
} from "@/lib/commerceTypes";
import { CE_SITUATION_STYLES } from "@/lib/ceStatusStyles";
import { formatEuro } from "@/lib/bpuEngine";

const ACTIVE_STATUTS = new Set([
  "detection",
  "analyse",
  "offre",
  "negociation",
  "closing",
]);

export function CeSituationKpiBar({
  dossiers,
  activeSituation,
  onToggleSituation,
}: {
  dossiers: CeDossier[];
  activeSituation: CeSituationJuridique | null;
  onToggleSituation: (code: CeSituationJuridique) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="mb-2 rounded-lg border border-border/70 bg-muted/30 p-2">
      <button
        type="button"
        className="mb-0 flex w-full items-center justify-between px-0.5 py-0.5 text-left md:pointer-events-none md:mb-1.5"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
      >
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Par situation
        </p>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform md:hidden",
            mobileOpen && "rotate-180",
          )}
        />
      </button>
      <div className={cn(!mobileOpen && "hidden md:block")}>
        <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-4">
          {CE_SITUATIONS.map((code) => {
            const matching = dossiers.filter((d) => d.situation_juridique === code);
            const actifs = matching.filter((d) => ACTIVE_STATUTS.has(d.statut));
            const valorisation = actifs.reduce(
              (s, d) => s + (d.valorisation_estimee ?? 0),
              0,
            );
            const selected = activeSituation === code;

            return (
              <button
                key={code}
                type="button"
                onClick={() => onToggleSituation(code)}
                aria-pressed={selected}
                className={cn(
                  "rounded-md border bg-background px-2.5 py-2 text-left transition-colors",
                  selected
                    ? cn("border", CE_SITUATION_STYLES[code].badge)
                    : "border-border/60 hover:bg-muted/50",
                )}
              >
                <span className="text-xs font-semibold text-foreground">
                  {CE_SITUATION_LABELS[code]}
                </span>
                <div className="mt-1 grid grid-cols-2 gap-1 text-xs leading-tight text-muted-foreground">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Actifs</p>
                    <p className="font-semibold tabular-nums text-foreground">{actifs.length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Valo.</p>
                    <p className="font-semibold tabular-nums text-foreground">
                      {formatEuro(valorisation)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
