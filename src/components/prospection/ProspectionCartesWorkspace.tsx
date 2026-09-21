import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ProspectionCartesCommuneEditor } from "@/components/prospection/ProspectionCartesCommuneEditor";
import { ProspectionCartesCommuneSheet } from "@/components/prospection/ProspectionCartesCommuneSheet";
import { ProspectionCartesControls } from "@/components/prospection/ProspectionCartesControls";
import { ProspectionCartesLegend } from "@/components/prospection/ProspectionCartesLegend";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import { upsertProspectionCommune } from "@/lib/prospection/api";
import { filterProspectionCommunes } from "@/lib/prospection/filterCommunes";
import { aggregatePrestataires } from "@/lib/prospection/mapStats";
import type { ProspectionMapColorMode, ProspectionMapSecteur } from "@/lib/prospection/mapTypes";
import { canonicalizePrestataire } from "@/lib/prospection/prestataireNomenclature";
import { mergeProspectionState } from "@/lib/prospection/referenceState";
import { useProspectionCommunes } from "@/hooks/useProspectionCommunes";
import { useProspectionFilters } from "@/hooks/useProspectionFilters";
import { useProspectionSearchParams } from "@/hooks/useProspectionSearchParams";
import {
  PROSPECTION_STATE_QUERY_KEY,
  useProspectionStateQuery,
} from "@/hooks/useProspectionStateQuery";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

const ProspectionCartesMap = lazy(() =>
  import("@/components/prospection/ProspectionCartesMap").then((m) => ({
    default: m.ProspectionCartesMap,
  })),
);

const DEFAULT_ROW: ProspectionCommuneState = {
  status: "todo",
  gestion: "",
  prestataire: "",
  contact: "",
  contacts: [],
  notes: "",
};

const COLOR_MODES = new Set<ProspectionMapColorMode>(["prestataire", "gestion", "statut"]);

function parseMapParams(params: URLSearchParams) {
  const mode = params.get("mode") as ProspectionMapColorMode | null;
  const highlight = params.get("highlight") ?? "";
  return {
    colorMode: mode && COLOR_MODES.has(mode) ? mode : ("prestataire" as ProspectionMapColorMode),
    highlightedPrestataires: highlight
      ? new Set(
          highlight
            .split("|")
            .map((s) => canonicalizePrestataire(decodeURIComponent(s)))
            .filter(Boolean),
        )
      : new Set<string>(),
  };
}

export function ProspectionCartesWorkspace() {
  const { data: communesBundle, isLoading: communesLoading } = useProspectionCommunes();
  const communes = communesBundle?.communes ?? [];
  const departements = communesBundle?.departements ?? [];

  const [searchParams, setSearchParams] = useProspectionSearchParams();
  const initialMapParams = useRef(parseMapParams(searchParams));
  const syncedMapParamsRef = useRef(initialMapParams.current);

  const {
    search,
    setSearch,
    filterDepartement,
    filterAgglo,
    setFilterAgglo,
    filterPop,
    setFilterPop,
    statusTab,
    agglos,
    handleFilterDepartementChange,
  } = useProspectionFilters(communes);

  const {
    data: state = {},
    isLoading: stateLoading,
    isFetching: stateFetching,
    error: stateError,
    refetch,
  } = useProspectionStateQuery();

  const [secteur] = useState<ProspectionMapSecteur>("EP");
  const [colorMode, setColorMode] = useState<ProspectionMapColorMode>(initialMapParams.current.colorMode);
  const [highlightedPrestataires, setHighlightedPrestataires] = useState<Set<string>>(
    initialMapParams.current.highlightedPrestataires,
  );
  const [companySearch, setCompanySearch] = useState("");
  const [selectedCommuneKey, setSelectedCommuneKey] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const fromUrl = parseMapParams(searchParams);
    if (
      fromUrl.colorMode === syncedMapParamsRef.current.colorMode &&
      [...fromUrl.highlightedPrestataires].join("|") ===
        [...syncedMapParamsRef.current.highlightedPrestataires].join("|")
    ) {
      return;
    }
    syncedMapParamsRef.current = fromUrl;
    setColorMode(fromUrl.colorMode);
    setHighlightedPrestataires(fromUrl.highlightedPrestataires);
  }, [searchParams]);

  useEffect(() => {
    const current = { colorMode, highlightedPrestataires };
    if (
      current.colorMode === syncedMapParamsRef.current.colorMode &&
      [...current.highlightedPrestataires].join("|") ===
        [...syncedMapParamsRef.current.highlightedPrestataires].join("|")
    ) {
      return;
    }
    syncedMapParamsRef.current = current;
    const next = new URLSearchParams(searchParams);
    if (colorMode !== "prestataire") next.set("mode", colorMode);
    else next.delete("mode");
    if (highlightedPrestataires.size > 0) {
      next.set(
        "highlight",
        [...highlightedPrestataires].map((s) => encodeURIComponent(s)).join("|"),
      );
    } else {
      next.delete("highlight");
    }
    setSearchParams(next, { replace: true });
  }, [colorMode, highlightedPrestataires, searchParams, setSearchParams]);

  const listFilters = useMemo(
    () => ({
      search,
      filterDepartement,
      filterAgglo,
      filterPop,
      statusTab,
    }),
    [search, filterDepartement, filterAgglo, filterPop, statusTab],
  );

  const effectiveStateMap = useMemo(() => {
    const map: Record<string, ProspectionCommuneState> = {};
    for (const commune of communes) {
      map[commune.key] = mergeProspectionState(commune.key, state[commune.key]);
    }
    return map;
  }, [communes, state]);

  const baseFiltered = useMemo(
    () => filterProspectionCommunes(communes, effectiveStateMap, listFilters),
    [communes, effectiveStateMap, listFilters],
  );

  const prestataireStats = useMemo(
    () =>
      aggregatePrestataires(
        baseFiltered.map((commune) => ({
          state: effectiveStateMap[commune.key] ?? DEFAULT_ROW,
        })),
      ),
    [baseFiltered, effectiveStateMap],
  );

  const selectedCommune = useMemo(
    () => baseFiltered.find((c) => c.key === selectedCommuneKey) ?? null,
    [baseFiltered, selectedCommuneKey],
  );

  const selectedCommuneState = useMemo(() => {
    if (!selectedCommuneKey) return null;
    return effectiveStateMap[selectedCommuneKey] ?? DEFAULT_ROW;
  }, [effectiveStateMap, selectedCommuneKey]);

  const handleSaveCommune = useCallback(
    async (patch: Partial<ProspectionCommuneState>) => {
      if (!selectedCommune) return;
      const current = mergeProspectionState(selectedCommune.key, state[selectedCommune.key]);
      const next: ProspectionCommuneState = { ...current, ...patch };
      await upsertProspectionCommune(selectedCommune.key, patch);
      queryClient.setQueryData<Record<string, ProspectionCommuneState>>(
        PROSPECTION_STATE_QUERY_KEY,
        (prev = {}) => ({ ...prev, [selectedCommune.key]: next }),
      );
      toast({ title: "Enregistré", description: `${selectedCommune.ville} mis à jour.` });
    },
    [queryClient, selectedCommune, state, toast],
  );

  const handleCommuneSelect = useCallback((commune: ProspectionCommune) => {
    setSelectedCommuneKey(commune.key);
  }, []);

  const handleTogglePrestataire = useCallback((name: string, multi: boolean) => {
    setHighlightedPrestataires((prev) => {
      const next = multi ? new Set(prev) : new Set<string>();
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleClearHighlight = useCallback(() => {
    setHighlightedPrestataires(new Set());
  }, []);

  const loadError =
    stateError instanceof Error ? stateError.message : stateError ? String(stateError) : null;
  const isInitialLoad = communesLoading || stateLoading;

  if (loadError && isInitialLoad) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ProspectionCartesControls
        search={search}
        onSearchChange={setSearch}
        filterDepartement={filterDepartement}
        onFilterDepartementChange={handleFilterDepartementChange}
        filterAgglo={filterAgglo}
        onFilterAggloChange={setFilterAgglo}
        filterPop={filterPop}
        onFilterPopChange={setFilterPop}
        agglos={agglos}
        secteur={secteur}
        onSecteurChange={() => undefined}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        visibleCount={baseFiltered.length}
        departements={departements}
      />

      {(stateFetching || isInitialLoad) && (
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {isInitialLoad ? "Chargement du référentiel et des données…" : "Synchronisation…"}
        </div>
      )}

      <div
        className={
          selectedCommune
            ? "grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px_280px]"
            : "grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]"
        }
      >
        <div className="min-h-[420px] p-3 sm:p-4 lg:min-h-0">
          {isInitialLoad ? (
            <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-border/70 bg-muted/20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-border/70 bg-muted/20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <ProspectionCartesMap
                communes={baseFiltered}
                stateMap={effectiveStateMap}
                colorMode={colorMode}
                highlightedPrestataires={highlightedPrestataires}
                selectedCommuneKey={selectedCommuneKey}
                onCommuneSelect={handleCommuneSelect}
              />
            </Suspense>
          )}
        </div>

        {selectedCommune && selectedCommuneState ? (
          <aside className="hidden min-h-0 min-w-0 flex-col border-t border-border/60 bg-card lg:flex lg:border-l lg:border-t-0">
            <ProspectionCartesCommuneEditor
              commune={selectedCommune}
              state={selectedCommuneState}
              onSave={handleSaveCommune}
              onClose={() => setSelectedCommuneKey(null)}
              className="flex min-h-0 flex-1 flex-col"
            />
          </aside>
        ) : null}

        <aside className="min-h-[240px] border-t border-border/60 bg-card lg:min-h-0 lg:border-l lg:border-t-0">
          <ProspectionCartesLegend
            colorMode={colorMode}
            prestataireStats={prestataireStats}
            highlightedPrestataires={highlightedPrestataires}
            onTogglePrestataire={handleTogglePrestataire}
            onClearHighlight={handleClearHighlight}
            companySearch={companySearch}
            onCompanySearchChange={setCompanySearch}
          />
        </aside>
      </div>

      <ProspectionCartesCommuneSheet
        commune={selectedCommune}
        state={selectedCommuneState}
        open={Boolean(selectedCommune)}
        onOpenChange={(open) => {
          if (!open) setSelectedCommuneKey(null);
        }}
        onSave={handleSaveCommune}
      />
    </div>
  );
}
