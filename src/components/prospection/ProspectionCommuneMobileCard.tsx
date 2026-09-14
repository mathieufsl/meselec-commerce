import { memo } from "react";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import { aggloBadgeClass, statusLabel, statusSelectClass } from "@/lib/prospection/ui";
import { departementShortLabel } from "@/lib/prospection/crmUi";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type Props = {
  commune: ProspectionCommune;
  row: ProspectionCommuneState;
  isDirty: boolean;
  onOpenDetail: (commune: ProspectionCommune) => void;
};

export const ProspectionCommuneMobileCard = memo(function ProspectionCommuneMobileCard({
  commune,
  row,
  isDirty,
  onOpenDetail,
}: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpenDetail(commune)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors active:bg-muted/60",
        isDirty && "ring-1 ring-primary/30",
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">
              <span className="mr-1.5 text-[10px] font-bold text-muted-foreground">
                {departementShortLabel(commune.departement)}
              </span>
              {commune.ville}
            </p>
            <p className="text-xs text-muted-foreground">
              {commune.habitants.toLocaleString("fr")} hab.
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
              statusSelectClass(row.status),
            )}
          >
            {statusLabel(row.status)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-block max-w-full rounded-md px-2 py-0.5 text-[10px] font-semibold leading-snug",
              aggloBadgeClass(commune.agglo),
            )}
          >
            {commune.agglo || "N/A"}
          </span>
          {row.prestataire ? (
            <span className="truncate text-xs font-medium text-success">{row.prestataire}</span>
          ) : null}
        </div>

        {row.contact || row.notes || row.contacts.length > 0 ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {[row.contact || null, row.notes || null].filter(Boolean).join(" · ")}
          </p>
        ) : null}

        {isDirty ? (
          <p className="text-[11px] font-medium text-warning">Modifications non enregistrées</p>
        ) : null}
      </div>

      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
});
