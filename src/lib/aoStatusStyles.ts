import type { AoStatut } from "@/lib/commerceTypes";

/** Presentation-only styling map for AO statuses (badges, tabs, group headers). */
export const AO_STATUT_STYLES: Record<
  AoStatut,
  { badge: string; dot: string; tab: string; bar: string }
> = {
  non_traite: {
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
  en_cours: {
    badge: "bg-info-subtle text-info border-info/20",
    dot: "bg-info",
    tab: "data-[selected=true]:bg-info data-[selected=true]:text-white",
    bar: "bg-info",
  },
  depose: {
    badge: "bg-accent-subtle text-[var(--color-accent)] border-[var(--color-accent)]/20",
    dot: "bg-[var(--color-accent)]",
    tab: "data-[selected=true]:bg-[var(--color-accent)] data-[selected=true]:text-white",
    bar: "bg-[var(--color-accent)]",
  },
  gagne: {
    badge: "bg-success-subtle text-success border-success/20",
    dot: "bg-success",
    tab: "data-[selected=true]:bg-success data-[selected=true]:text-white",
    bar: "bg-success",
  },
  perdu: {
    badge: "bg-error-subtle text-error border-error/20",
    dot: "bg-error",
    tab: "data-[selected=true]:bg-error data-[selected=true]:text-white",
    bar: "bg-error",
  },
  abandonne: {
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/60",
    tab: "data-[selected=true]:bg-muted-foreground data-[selected=true]:text-white",
    bar: "bg-muted-foreground/60",
  },
};
