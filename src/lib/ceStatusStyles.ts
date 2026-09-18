import type { CeSituationJuridique, CeStatut } from "@/lib/commerceTypes";

/** Presentation-only styling for CE pipeline statuses. */
export const CE_STATUT_STYLES: Record<
  CeStatut,
  { badge: string; dot: string; tab: string; bar: string }
> = {
  detection: {
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-600",
    dot: "bg-slate-500",
    tab: "data-[selected=true]:bg-slate-500 data-[selected=true]:text-white",
    bar: "bg-slate-500",
  },
  analyse: {
    badge: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
    tab: "data-[selected=true]:bg-primary data-[selected=true]:text-white",
    bar: "bg-primary",
  },
  offre: {
    badge: "bg-info-subtle text-info border-info/20",
    dot: "bg-info",
    tab: "data-[selected=true]:bg-info data-[selected=true]:text-white",
    bar: "bg-info",
  },
  negociation: {
    badge: "bg-accent-subtle text-[var(--color-accent)] border-[var(--color-accent)]/20",
    dot: "bg-[var(--color-accent)]",
    tab: "data-[selected=true]:bg-[var(--color-accent)] data-[selected=true]:text-white",
    bar: "bg-[var(--color-accent)]",
  },
  closing: {
    badge: "bg-warning/15 text-warning border-warning/25",
    dot: "bg-warning",
    tab: "data-[selected=true]:bg-warning data-[selected=true]:text-white",
    bar: "bg-warning",
  },
  acquis: {
    badge: "bg-success-subtle text-success border-success/20",
    dot: "bg-success",
    tab: "data-[selected=true]:bg-success data-[selected=true]:text-white",
    bar: "bg-success",
  },
  abandonne: {
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/60",
    tab: "data-[selected=true]:bg-muted-foreground data-[selected=true]:text-white",
    bar: "bg-muted-foreground/60",
  },
};

/** Presentation-only styling for legal situation badges. */
export const CE_SITUATION_STYLES: Record<
  CeSituationJuridique,
  { badge: string; dot: string }
> = {
  in_bonis: {
    badge: "bg-success-subtle text-success border-success/20",
    dot: "bg-success",
  },
  sauvegarde: {
    badge: "bg-info-subtle text-info border-info/20",
    dot: "bg-info",
  },
  redressement: {
    badge: "bg-warning/15 text-warning border-warning/25",
    dot: "bg-warning",
  },
  liquidation: {
    badge: "bg-error-subtle text-error border-error/20",
    dot: "bg-error",
  },
};
