import type { ProspectionStatusTab } from "@/components/prospection/ProspectionStatusTabs";

export type ProspectionListFilters = {
  search: string;
  filterDepartement: string;
  filterAgglo: string;
  filterPop: string;
  statusTab: ProspectionStatusTab;
};

export const PROSPECTION_STATUS_TABS: ProspectionStatusTab[] = [
  "all",
  "todo",
  "inprogress",
  "done",
  "callback",
  "refused",
];

export const PROSPECTION_POP_FILTERS = new Set(["", "big", "med", "small"]);

export function parseProspectionFilters(params: URLSearchParams): ProspectionListFilters {
  const pop = params.get("pop") ?? "";
  const status = params.get("status") as ProspectionStatusTab | null;
  return {
    search: params.get("q") ?? "",
    filterDepartement: params.get("dep") ?? "",
    filterAgglo: params.get("agglo") ?? "",
    filterPop: PROSPECTION_POP_FILTERS.has(pop) ? pop : "",
    statusTab: status && PROSPECTION_STATUS_TABS.includes(status) ? status : "all",
  };
}

export function buildProspectionSearchParams(filters: ProspectionListFilters): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.search.trim()) next.set("q", filters.search.trim());
  if (filters.filterDepartement) next.set("dep", filters.filterDepartement);
  if (filters.filterAgglo) next.set("agglo", filters.filterAgglo);
  if (filters.filterPop) next.set("pop", filters.filterPop);
  if (filters.statusTab !== "all") next.set("status", filters.statusTab);
  return next;
}

export function prospectionFiltersEqual(a: ProspectionListFilters, b: ProspectionListFilters): boolean {
  return (
    a.search === b.search &&
    a.filterDepartement === b.filterDepartement &&
    a.filterAgglo === b.filterAgglo &&
    a.filterPop === b.filterPop &&
    a.statusTab === b.statusTab
  );
}
