import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionStatusTab } from "@/components/prospection/ProspectionStatusTabs";
import {
  buildProspectionSearchParams,
  parseProspectionFilters,
  prospectionFiltersEqual,
  type ProspectionListFilters,
} from "@/lib/prospection/filters";
import { useProspectionSearchParams } from "@/hooks/useProspectionSearchParams";

export function useProspectionFilters(communes: ProspectionCommune[] = []) {
  const [searchParams, setSearchParams] = useProspectionSearchParams();
  const initialFilters = useRef(parseProspectionFilters(searchParams));
  const syncedFiltersRef = useRef(initialFilters.current);

  const [search, setSearch] = useState(initialFilters.current.search);
  const [filterDepartement, setFilterDepartement] = useState(initialFilters.current.filterDepartement);
  const [filterAgglo, setFilterAgglo] = useState(initialFilters.current.filterAgglo);
  const [filterPop, setFilterPop] = useState(initialFilters.current.filterPop);
  const [statusTab, setStatusTab] = useState<ProspectionStatusTab>(initialFilters.current.statusTab);

  const agglos = useMemo(() => {
    const source = filterDepartement
      ? communes.filter((c) => c.departement === filterDepartement)
      : communes;
    return [...new Set(source.map((c) => c.agglo).filter(Boolean))].sort();
  }, [filterDepartement, communes]);

  useEffect(() => {
    if (filterAgglo && !agglos.includes(filterAgglo)) {
      setFilterAgglo("");
    }
  }, [filterAgglo, agglos]);

  const currentFilters = useMemo(
    (): ProspectionListFilters => ({
      search,
      filterDepartement,
      filterAgglo,
      filterPop,
      statusTab,
    }),
    [search, filterDepartement, filterAgglo, filterPop, statusTab],
  );

  useEffect(() => {
    if (prospectionFiltersEqual(currentFilters, syncedFiltersRef.current)) return;
    syncedFiltersRef.current = currentFilters;
    setSearchParams(buildProspectionSearchParams(currentFilters), { replace: true });
  }, [currentFilters, setSearchParams]);

  useEffect(() => {
    const fromUrl = parseProspectionFilters(searchParams);
    if (prospectionFiltersEqual(fromUrl, syncedFiltersRef.current)) return;
    syncedFiltersRef.current = fromUrl;
    setSearch(fromUrl.search);
    setFilterDepartement(fromUrl.filterDepartement);
    setFilterAgglo(fromUrl.filterAgglo);
    setFilterPop(fromUrl.filterPop);
    setStatusTab(fromUrl.statusTab);
  }, [searchParams]);

  const handleFilterDepartementChange = useCallback((value: string) => {
    setFilterDepartement(value);
    setFilterAgglo("");
  }, []);

  return {
    search,
    setSearch,
    filterDepartement,
    setFilterDepartement,
    filterAgglo,
    setFilterAgglo,
    filterPop,
    setFilterPop,
    statusTab,
    setStatusTab,
    agglos,
    handleFilterDepartementChange,
    currentFilters,
  };
}
