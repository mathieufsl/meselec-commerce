import {
  CE_SITUATION_LABELS,
  CE_STATUT_LABELS,
  type CeDossier,
  type CeStatut,
} from "@/lib/commerceTypes";
import { CE_SITUATION_STYLES, CE_STATUT_STYLES } from "@/lib/ceStatusStyles";
import { daysUntil, formatEuro } from "@/lib/bpuEngine";
import { cleanDisplaySeparators } from "@/lib/displayText";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Users } from "lucide-react";

export function CeCard({
  dossier,
  onSelect,
}: {
  dossier: CeDossier;
  onSelect?: (dossier: CeDossier) => void;
}) {
  const statut = dossier.statut as CeStatut;
  const deadlineDate =
    dossier.situation_juridique === "redressement" && dossier.date_echeance_offre
      ? dossier.date_echeance_offre
      : dossier.date_closing_cible;
  const days = daysUntil(deadlineDate);
  const urgent = days != null && days >= 0 && days <= 14;
  const cible = cleanDisplaySeparators(dossier.nom_cible);
  const lieu = dossier.lieu?.trim() ? cleanDisplaySeparators(dossier.lieu) : null;
  const hasValorisation =
    dossier.valorisation_estimee != null && dossier.valorisation_estimee > 0;
  const showOffreDeadline =
    dossier.situation_juridique === "redressement" && Boolean(dossier.date_echeance_offre);

  const className = cn(
    "group relative block w-full overflow-hidden rounded-xl border border-border/60 bg-card p-3.5 pl-4 text-left shadow-sm transition-all",
    "hover:border-border hover:bg-muted/20 hover:shadow-sm active:bg-muted/40",
    onSelect && "cursor-pointer",
  );

  const inner = (
    <>
      <span className={cn("absolute inset-y-0 left-0 w-0.5", CE_STATUT_STYLES[statut].bar)} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{cible}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{dossier.reference}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
              CE_STATUT_STYLES[statut].badge,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", CE_STATUT_STYLES[statut].dot)} />
            {CE_STATUT_LABELS[statut]}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
              CE_SITUATION_STYLES[dossier.situation_juridique].badge,
            )}
          >
            {CE_SITUATION_LABELS[dossier.situation_juridique]}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {lieu ? (
          <span className="inline-flex max-w-[8rem] items-center gap-0.5 truncate">
            <MapPin className="h-3 w-3 shrink-0 opacity-60" />
            {lieu}
          </span>
        ) : null}
        {dossier.effectif != null ? (
          <span className="inline-flex items-center gap-0.5">
            <Users className="h-3 w-3 shrink-0 opacity-60" />
            {dossier.effectif}
          </span>
        ) : null}
        {deadlineDate ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 tabular-nums",
              urgent ? "font-medium text-[var(--color-accent)]" : "",
            )}
          >
            <Calendar className="h-3 w-3 shrink-0 opacity-60" />
            {showOffreDeadline ? "Offre " : ""}
            {new Date(deadlineDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
            {days != null && days >= 0 ? ` · J-${days}` : ""}
          </span>
        ) : null}
        {hasValorisation ? (
          <span className="ml-auto font-medium tabular-nums text-foreground/80">
            {formatEuro(dossier.valorisation_estimee!)}
          </span>
        ) : null}
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button type="button" className={className} onClick={() => onSelect(dossier)}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}
