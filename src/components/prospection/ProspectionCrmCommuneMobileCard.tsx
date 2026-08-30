import type { CrmCommune } from "@/data/crmCommunes";
import type { CrmCommuneState } from "@/lib/prospection/crmApi";
import { aggloBadgeClass } from "@/lib/prospection/ui";
import { departementShortLabel, normalizeQuiCible, nuanceBadgeClass } from "@/lib/prospection/crmUi";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type Props = {
  commune: CrmCommune;
  row: CrmCommuneState;
  isDirty: boolean;
  onOpenDetail: (commune: CrmCommune) => void;
};

export function ProspectionCrmCommuneMobileCard({
  commune,
  row,
  isDirty,
  onOpenDetail,
}: Props) {
  const formatDate = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("fr-FR");
  };

  return (
    <button
      type="button"
      onClick={() => onOpenDetail(commune)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors active:bg-muted/50",
        isDirty && "ring-1 ring-primary/40",
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{commune.ville}</p>
            <p className="text-[11px] text-muted-foreground">
              {departementShortLabel(commune.departement)} · {commune.habitants.toLocaleString("fr")} hab.
            </p>
          </div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold",
              aggloBadgeClass(commune.agglo),
            )}
          >
            {commune.agglo || "N/A"}
          </span>
          {commune.nuance ? (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                nuanceBadgeClass(commune.nuance),
              )}
            >
              {commune.nuance}
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{commune.maire}</p>
        {normalizeQuiCible(row.quiCible) ? (
          <p className="truncate text-xs font-medium text-warning">
            Cible : {normalizeQuiCible(row.quiCible)}
          </p>
        ) : null}
        {row.prestataire ? <p className="truncate text-xs text-muted-foreground">Prestataire : {row.prestataire}</p> : null}
        {row.dateRecandidature ? (
          <p className="truncate text-xs font-medium text-info">Recandidature : {formatDate(row.dateRecandidature)}</p>
        ) : null}
      </div>
    </button>
  );
}
