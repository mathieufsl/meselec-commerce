import type { AoStatut } from "@/lib/commerceTypes";

/** Presentation-only styling map for AO statuses (badges, tabs, group headers). */
export const AO_STATUT_STYLES: Record<
  AoStatut,
  { badge: string; dot: string; tab: string; bar: string }
> = {
  veille: {
    badge: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-200",
    dot: "bg-slate-400",
    tab: "data-[selected=true]:bg-slate-600 data-[selected=true]:text-white",
    bar: "bg-slate-400",
  },
  analyse: {
    badge: "bg-violet-100 text-violet-800 ring-violet-600/20 dark:bg-violet-900/50 dark:text-violet-200",
    dot: "bg-violet-500",
    tab: "data-[selected=true]:bg-violet-600 data-[selected=true]:text-white",
    bar: "bg-violet-500",
  },
  en_cours: {
    badge: "bg-sky-100 text-sky-800 ring-sky-600/20 dark:bg-sky-900/50 dark:text-sky-200",
    dot: "bg-sky-500",
    tab: "data-[selected=true]:bg-sky-600 data-[selected=true]:text-white",
    bar: "bg-sky-500",
  },
  depose: {
    badge: "bg-cyan-100 text-cyan-800 ring-cyan-600/20 dark:bg-cyan-900/50 dark:text-cyan-200",
    dot: "bg-cyan-500",
    tab: "data-[selected=true]:bg-cyan-600 data-[selected=true]:text-white",
    bar: "bg-cyan-500",
  },
  gagne: {
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/50 dark:text-emerald-200",
    dot: "bg-emerald-500",
    tab: "data-[selected=true]:bg-emerald-600 data-[selected=true]:text-white",
    bar: "bg-emerald-500",
  },
  perdu: {
    badge: "bg-rose-100 text-rose-800 ring-rose-600/20 dark:bg-rose-900/50 dark:text-rose-200",
    dot: "bg-rose-500",
    tab: "data-[selected=true]:bg-rose-600 data-[selected=true]:text-white",
    bar: "bg-rose-500",
  },
  abandonne: {
    badge: "bg-neutral-200 text-neutral-700 ring-neutral-600/20 dark:bg-neutral-700 dark:text-neutral-200",
    dot: "bg-neutral-400",
    tab: "data-[selected=true]:bg-neutral-600 data-[selected=true]:text-white",
    bar: "bg-neutral-400",
  },
};
