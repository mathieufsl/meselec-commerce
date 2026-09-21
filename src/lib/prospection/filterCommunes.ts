import type { ProspectionStatusTab } from "@/components/prospection/ProspectionStatusTabs";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionCommuneState, ProspectionStateMap } from "@/lib/prospection/api";

export type ProspectionCommuneFilters = {
  search: string;
  filterDepartement: string;
  filterAgglo: string;
  filterPop: string;
  statusTab: ProspectionStatusTab;
};

const DEFAULT_ROW: ProspectionCommuneState = {
  status: "todo",
  gestion: "",
  prestataire: "",
  contact: "",
  contacts: [],
  notes: "",
};

export function filterProspectionCommunes(
  communes: ProspectionCommune[],
  state: ProspectionStateMap,
  filters: ProspectionCommuneFilters,
): ProspectionCommune[] {
  const q = filters.search.toLowerCase();
  const result: ProspectionCommune[] = [];

  for (const c of communes) {
    const s = state[c.key] ?? DEFAULT_ROW;
    if (
      q &&
      !c.ville.toLowerCase().includes(q) &&
      !c.maire.toLowerCase().includes(q) &&
      !c.agglo.toLowerCase().includes(q) &&
      !c.departement.toLowerCase().includes(q) &&
      !(s.prestataire || "").toLowerCase().includes(q)
    ) {
      continue;
    }
    if (filters.filterDepartement && c.departement !== filters.filterDepartement) continue;
    if (filters.filterAgglo && c.agglo !== filters.filterAgglo) continue;
    if (filters.filterPop === "big" && c.habitants < 5000) continue;
    if (filters.filterPop === "med" && (c.habitants < 1000 || c.habitants >= 5000)) continue;
    if (filters.filterPop === "small" && c.habitants >= 1000) continue;
    if (filters.statusTab !== "all" && s.status !== filters.statusTab) continue;
    result.push(c);
  }

  return result;
}

export function computeProspectionStatusCounts(
  communes: ProspectionCommune[],
  state: ProspectionStateMap,
  filters: Omit<ProspectionCommuneFilters, "statusTab">,
): Record<ProspectionStatusTab, number> {
  const base = filterProspectionCommunes(communes, state, { ...filters, statusTab: "all" });
  const counts: Record<ProspectionStatusTab, number> = {
    all: base.length,
    todo: 0,
    inprogress: 0,
    done: 0,
    callback: 0,
    refused: 0,
  };
  for (const c of base) {
    counts[(state[c.key] ?? DEFAULT_ROW).status] += 1;
  }
  return counts;
}

export function computeProspectionStats(
  communes: ProspectionCommune[],
  state: ProspectionStateMap,
  filters: Omit<ProspectionCommuneFilters, "statusTab">,
) {
  const base = filterProspectionCommunes(communes, state, { ...filters, statusTab: "all" });
  let done = 0;
  let todo = 0;
  for (const c of base) {
    const status = (state[c.key] ?? DEFAULT_ROW).status;
    if (status === "done") done++;
    if (status === "todo") todo++;
  }
  const total = base.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, todo, pct, total };
}
