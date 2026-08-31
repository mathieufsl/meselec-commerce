import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AO_SECTEUR_LABELS,
  AO_SECTEURS,
  type AoSecteurCode,
  type AppelOffre,
} from "@/lib/commerceTypes";
import { AO_SECTEUR_BADGE_CLASS } from "@/components/commerce/CommerceAoSecteurFilter";

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const ACTIVE_STATUTS = new Set(["non_traite", "analyse", "en_cours", "depose"]);

function secteurCodes(ao: AppelOffre): AoSecteurCode[] {
  return (ao.ao_secteurs ?? []).map((s) => s.secteur);
}

export function CommerceSecteurKpiBar({
  aos,
  activeSecteur,
  onToggleSecteur,
}: {
  aos: AppelOffre[];
  activeSecteur: AoSecteurCode | null;
  onToggleSecteur: (code: AoSecteurCode) => void;
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
          Par secteur
        </p>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform md:hidden",
            mobileOpen && "rotate-180",
          )}
        />
      </button>
      <div className={cn(!mobileOpen && "hidden md:block")}>
      <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {AO_SECTEURS.map((code) => {
          const matching = aos.filter((ao) => secteurCodes(ao).includes(code));
          const actifs = matching.filter((a) => ACTIVE_STATUTS.has(a.statut));
          const gagnes = matching.filter((a) => a.statut === "gagne");
          const montantPipeline = actifs.reduce((s, a) => s + (a.montant_estime ?? 0), 0);
          const montantSigne = gagnes.reduce((s, a) => s + (a.montant_estime ?? 0), 0);
          const selected = activeSecteur === code;

          return (
            <button
              key={code}
              type="button"
              onClick={() => onToggleSecteur(code)}
              aria-pressed={selected}
              className={cn(
                "rounded-md border bg-background px-2.5 py-2 text-left transition-colors",
                selected
                  ? cn("border", AO_SECTEUR_BADGE_CLASS[code])
                  : "border-border/60 hover:bg-muted/50",
              )}
            >
              <span className="text-xs font-semibold text-foreground">
                {AO_SECTEUR_LABELS[code]}
              </span>
              <div className="mt-1 grid grid-cols-3 gap-1 text-xs leading-tight text-muted-foreground">
                <div>
                  <p className="text-[11px] text-muted-foreground">Pipeline</p>
                  <p className="font-semibold tabular-nums text-foreground">{fmt(montantPipeline)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Signé</p>
                  <p className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmt(montantSigne)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">AO</p>
                  <p className="font-semibold tabular-nums text-foreground">{matching.length}</p>
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

export function AoSecteurBadges({ secteurs }: { secteurs?: AoSecteurCode[] }) {
  if (!secteurs?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {secteurs.map((code) => (
        <span
          key={code}
          className={cn(
            "inline-flex rounded border px-1.5 py-0.5 text-xs font-medium",
            AO_SECTEUR_BADGE_CLASS[code],
          )}
        >
          {AO_SECTEUR_LABELS[code]}
        </span>
      ))}
    </div>
  );
}
