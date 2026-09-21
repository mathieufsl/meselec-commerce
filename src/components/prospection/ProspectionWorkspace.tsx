import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  saveProspectionStateMap,
  type ProspectionCommuneState,
  type ProspectionStateMap,
} from "@/lib/prospection/api";
import { summarizeContacts } from "@/lib/prospection/contacts";
import { ProspectionCommuneDetailSheet } from "@/components/prospection/ProspectionCommuneDetailSheet";
import { ProspectionScriptsModal } from "@/components/prospection/ProspectionScriptsModal";
import { ProspectionFiltersBar } from "@/components/prospection/ProspectionFiltersBar";
import { ProspectionVirtualMobileList } from "@/components/prospection/ProspectionVirtualMobileList";
import { ProspectionVirtualTable } from "@/components/prospection/ProspectionVirtualTable";
import {
  buildProspectionStatusTabs,
  ProspectionStatusTabsDesktop,
  ProspectionStatusTabsMobileScroll,
} from "@/components/prospection/ProspectionStatusTabs";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProspectionCommunes } from "@/hooks/useProspectionCommunes";
import { useProspectionFilters } from "@/hooks/useProspectionFilters";
import { useProspectionStateQuery } from "@/hooks/useProspectionStateQuery";
import {
  computeProspectionStats,
  computeProspectionStatusCounts,
  filterProspectionCommunes,
} from "@/lib/prospection/filterCommunes";
import { cn } from "@/lib/utils";
import { Download, FileText, Loader2, MoreVertical, RefreshCw, RotateCcw, Save } from "lucide-react";

const DEFAULT_ROW: ProspectionCommuneState = {
  status: "todo",
  gestion: "",
  prestataire: "",
  contact: "",
  contacts: [],
  notes: "",
};
function rowKey(row: ProspectionCommuneState): string {
  return `${row.status}|${row.gestion}|${row.prestataire}|${summarizeContacts(row.contacts)}|${row.notes}`;
}

function getChangedRowsFromDirtyKeys(
  current: ProspectionStateMap,
  dirtyKeys: Set<string>,
): ProspectionStateMap {
  const changed: ProspectionStateMap = {};
  for (const communeKey of dirtyKeys) {
    changed[communeKey] = current[communeKey] ?? DEFAULT_ROW;
  }
  return changed;
}

type ScriptTarget = { ville: string; agglo: string; maire: string } | null;

export function ProspectionWorkspace() {
  const { data: communesBundle, isLoading: communesLoading } = useProspectionCommunes();
  const communes = communesBundle?.communes ?? [];
  const departements = communesBundle?.departements ?? [];

  const {
    search,
    setSearch,
    filterDepartement,
    filterAgglo,
    setFilterAgglo,
    filterPop,
    setFilterPop,
    statusTab,
    setStatusTab,
    agglos,
    handleFilterDepartementChange,
  } = useProspectionFilters(communes);

  const {
    data: serverState = {},
    isLoading: stateLoading,
    isFetching: stateFetching,
    error: stateError,
    refetch,
  } = useProspectionStateQuery();

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [state, setState] = useState<ProspectionStateMap>({});
  const [savedState, setSavedState] = useState<ProspectionStateMap>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(() => new Set());
  const stateRef = useRef(state);
  const savedStateRef = useRef(savedState);
  const dirtyKeysRef = useRef(dirtyKeys);
  stateRef.current = state;
  savedStateRef.current = savedState;
  dirtyKeysRef.current = dirtyKeys;
  const [saving, setSaving] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [scriptsOpen, setScriptsOpen] = useState(false);
  const [scriptTarget, setScriptTarget] = useState<ScriptTarget>(null);
  const [detailCommune, setDetailCommune] = useState<ProspectionCommune | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (stateLoading || hydrated) return;
    setState(serverState);
    setSavedState(serverState);
    setDirtyKeys(new Set());
    setHydrated(true);
  }, [serverState, stateLoading, hydrated]);

  const loadFromServer = useCallback(async () => {
    const result = await refetch();
    if (result.data) {
      setState(result.data);
      setSavedState(result.data);
      setDirtyKeys(new Set());
      setHydrated(true);
    }
  }, [refetch]);

  const syncDirtyForKey = useCallback((communeKey: string, nextRow: ProspectionCommuneState) => {
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      const saved = savedStateRef.current[communeKey] ?? DEFAULT_ROW;
      if (rowKey(nextRow) === rowKey(saved)) next.delete(communeKey);
      else next.add(communeKey);
      return next;
    });
  }, []);

  const updateRow = useCallback(
    (communeKey: string, patch: Partial<ProspectionCommuneState>) => {
      setState((prev) => {
        const next = { ...DEFAULT_ROW, ...prev[communeKey], ...patch };
        if (patch.contacts) {
          next.contact = summarizeContacts(patch.contacts);
        }
        syncDirtyForKey(communeKey, next);
        return { ...prev, [communeKey]: next };
      });
    },
    [syncDirtyForKey],
  );

  const dirty = dirtyKeys.size > 0;

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const toSave = getChangedRowsFromDirtyKeys(stateRef.current, dirtyKeysRef.current);
      await saveProspectionStateMap(toSave);
      setSavedState((prev) => ({ ...prev, ...toSave }));
      setDirtyKeys(new Set());
      toast({ title: "Enregistré", description: "Les modifications ont été sauvegardées." });
    } catch (err) {
      console.error("Prospection save failed:", err);
      toast({
        variant: "destructive",
        title: "Échec de la sauvegarde",
        description:
          err instanceof Error ? err.message : "Impossible d'enregistrer les données sur le serveur.",
      });
    } finally {
      setSaving(false);
    }
  };

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

  const baseListFilters = useMemo(
    () => ({
      search,
      filterDepartement,
      filterAgglo,
      filterPop,
    }),
    [search, filterDepartement, filterAgglo, filterPop],
  );

  const filtered = useMemo(
    () => filterProspectionCommunes(communes, state, listFilters),
    [communes, state, listFilters],
  );

  const statusCounts = useMemo(
    () => computeProspectionStatusCounts(communes, state, baseListFilters),
    [communes, state, baseListFilters],
  );

  const statusTabs = useMemo(
    () =>
      buildProspectionStatusTabs({
        statusCounts,
        statusTab,
        onSelectTab: setStatusTab,
      }),
    [statusCounts, statusTab],
  );

  const stats = useMemo(
    () => computeProspectionStats(communes, state, baseListFilters),
    [communes, state, baseListFilters],
  );

  const loadError = stateError instanceof Error ? stateError.message : stateError ? String(stateError) : null;
  const isInitialLoad = communesLoading || (stateLoading && !hydrated);

  const handleOpenScript = useCallback((target: ScriptTarget) => {
    setScriptTarget(target);
    setScriptsOpen(true);
  }, []);

  const handleOpenDetail = useCallback((commune: ProspectionCommune) => {
    setDetailCommune(commune);
  }, []);

  const exportCsv = () => {
    const rows = stateRef.current;
    let csv = "Departement;Commune;Habitants;Agglo;Maire;Qui gere EP;Statut;Prestataire EP;Contact;Notes\n";
    for (const c of filterProspectionCommunes(communes, rows, { ...baseListFilters, statusTab: "all" })) {
      const s = rows[c.key] ?? DEFAULT_ROW;
      const contactSummary = summarizeContacts(s.contacts) || s.contact || "";
      csv += `"${c.departement}";"${c.ville}";${c.habitants};"${c.agglo}";"${c.maire}";"${s.gestion || ""}";"${s.status}";"${s.prestataire || ""}";"${contactSummary}";"${s.notes || ""}"\n`;
    }
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filterDepartement
      ? `MESELEC_Prospection_EP_${filterDepartement.match(/\((\d+)\)/)?.[1] ?? "IDF"}.csv`
      : "MESELEC_Prospection_EP_IDF.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearch("");
    handleFilterDepartementChange("");
    setFilterPop("");
    setStatusTab("all");
  };

  const actionButtons = (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={resetFilters}>
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Réinitialiser
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-9"
        disabled={!dirty || saving}
        onClick={() => void handleSave()}
      >
        {saving ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="mr-1.5 h-3.5 w-3.5" />
        )}
        Enregistrer
        {dirty ? ` (${dirtyKeys.size})` : ""}
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => void loadFromServer()}>
        Actualiser
      </Button>
      <Button type="button" size="sm" variant="secondary" className="h-9" onClick={exportCsv}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Exporter CSV
      </Button>
      <Button type="button" variant="secondary" size="sm" className="h-9" onClick={() => handleOpenScript(null)}>
        <FileText className="mr-1.5 h-3.5 w-3.5" />
        Scripts d&apos;appel
      </Button>
    </>
  );

  /** Mobile : une seule action primaire, le reste dans un menu. */
  const mobileActionButtons = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        className="h-9 flex-1"
        disabled={!dirty || saving}
        onClick={() => void handleSave()}
      >
        {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
        Enregistrer
        {dirty ? ` (${dirtyKeys.size})` : ""}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="Autres actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleOpenScript(null)}>
            <FileText className="mr-2 h-4 w-4" />
            Scripts d&apos;appel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void loadFromServer()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={resetFilters}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser les filtres
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  if (loadError && !hydrated) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
        <p className="text-xs text-muted-foreground">
          Vérifiez que la migration prospection est appliquée sur Supabase.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadFromServer()}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-full">
      <div className="shrink-0 border-b bg-card px-4 py-3 sm:px-5">
        <div className="hidden items-start gap-4 lg:flex">
          <ProspectionFiltersBar
            variant="desktop"
            className="min-w-0 flex-1"
            search={search}
            onSearchChange={setSearch}
            filterDepartement={filterDepartement}
            onFilterDepartementChange={handleFilterDepartementChange}
            departements={departements}
            filterAgglo={filterAgglo}
            onFilterAggloChange={setFilterAgglo}
            agglos={agglos}
            filterPop={filterPop}
            onFilterPopChange={setFilterPop}
          />
          <ProspectionStatsRow stats={stats} />
        </div>

        <div className="lg:hidden">
          <ProspectionStatsRow stats={stats} mobile />
        </div>
      </div>

      <div className="border-b bg-card lg:space-y-2 lg:px-4 lg:py-2.5 lg:sm:px-5">
        <div className="lg:hidden sticky z-[38] -mx-4 space-y-2 border-b border-border/80 bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/90 [top:var(--admin-mobile-sticky-offset,7.25rem)]">
          <ProspectionFiltersBar
            variant="mobile-sticky"
            search={search}
            onSearchChange={setSearch}
            filterDepartement={filterDepartement}
            onFilterDepartementChange={handleFilterDepartementChange}
            departements={departements}
            filterAgglo={filterAgglo}
            onFilterAggloChange={setFilterAgglo}
            agglos={agglos}
            filterPop={filterPop}
            onFilterPopChange={setFilterPop}
            mobileFiltersOpen={mobileFiltersOpen}
            onMobileFiltersOpenChange={setMobileFiltersOpen}
          />
          {mobileActionButtons}
          <ProspectionStatusTabsMobileScroll tabs={statusTabs} />
        </div>

        <div className="hidden lg:block lg:sticky lg:top-0 lg:z-10 -mx-4 space-y-2 border-b border-border/70 bg-background px-4 pb-2 pt-1 shadow-[0_1px_0_0_hsl(var(--border))] xl:-mx-5 xl:px-5">
          <div className="flex flex-wrap items-center justify-end gap-2">{actionButtons}</div>
          <ProspectionStatusTabsDesktop tabs={statusTabs} />
        </div>
      </div>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filtres</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Département</Label>
              <Select
                value={filterDepartement || "__all__"}
                onValueChange={(v) => handleFilterDepartementChange(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous départements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous départements</SelectItem>
                  {departements.map((dep) => (
                    <SelectItem key={dep} value={dep}>
                      {dep}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agglomération</Label>
              <Select
                value={filterAgglo || "__all__"}
                onValueChange={(v) => setFilterAgglo(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les agglomérations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes les agglomérations</SelectItem>
                  {agglos.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Taille</Label>
              <Select value={filterPop || "__all__"} onValueChange={(v) => setFilterPop(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes tailles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes tailles</SelectItem>
                  <SelectItem value="big">+ 5 000 hab.</SelectItem>
                  <SelectItem value="med">1 000 – 5 000</SelectItem>
                  <SelectItem value="small">- 1 000 hab.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" className="w-full" onClick={() => setMobileFiltersOpen(false)}>
              Appliquer
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {(stateFetching || isInitialLoad) && (
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {isInitialLoad ? "Chargement du référentiel communes…" : "Synchronisation des données…"}
        </div>
      )}

      <div className="min-h-0 flex-1 lg:overflow-hidden">
        {isInitialLoad ? (
          <div className="flex h-full min-h-[320px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Préparation de la liste…
          </div>
        ) : isMobile ? (
          <ProspectionVirtualMobileList
            communes={filtered}
            state={state}
            defaultRow={DEFAULT_ROW}
            dirtyKeys={dirtyKeys}
            onOpenDetail={handleOpenDetail}
          />
        ) : (
          <ProspectionVirtualTable
            communes={filtered}
            state={state}
            defaultRow={DEFAULT_ROW}
            dirtyKeys={dirtyKeys}
            onPatch={updateRow}
            onOpenScript={handleOpenScript}
            onOpenDetail={handleOpenDetail}
          />
        )}
      </div>

      <ProspectionCommuneDetailSheet
        open={detailCommune !== null}
        onOpenChange={(open) => {
          if (!open) setDetailCommune(null);
        }}
        commune={detailCommune}
        row={detailCommune ? (state[detailCommune.key] ?? DEFAULT_ROW) : DEFAULT_ROW}
        isDirty={detailCommune ? dirtyKeys.has(detailCommune.key) : false}
        onPatch={updateRow}
        onOpenScript={handleOpenScript}
      />

      <ProspectionScriptsModal
        open={scriptsOpen}
        onOpenChange={setScriptsOpen}
        ville={scriptTarget?.ville}
        agglo={scriptTarget?.agglo}
        maire={scriptTarget?.maire}
      />
    </div>
  );
}

const StatBox = memo(function StatBox({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="min-w-[88px] rounded-lg border px-3 py-2 text-center">
      <div className={cn("text-lg font-bold leading-tight", className)}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
});

function ProspectionStatsRow({
  stats,
  mobile = false,
}: {
  stats: { done: number; todo: number; pct: number; total: number };
  mobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 gap-2",
        mobile ? "grid grid-cols-2" : "flex flex-wrap items-stretch",
      )}
    >
      <StatBox label="Communes" value={stats.total} />
      <StatBox label="Obtenus" value={stats.done} className="text-success" />
      <StatBox label="À traiter" value={stats.todo} className="text-warning" />
      <div
        className={cn(
          "flex min-w-0 flex-col justify-center gap-1 rounded-lg border px-3 py-2",
          mobile ? "col-span-2 sm:col-span-1" : "min-w-[140px]",
        )}
      >
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-md bg-muted">
            <div
              className="h-full rounded-md bg-primary transition-all"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">{stats.pct}%</span>
        </div>
        <span className="text-center text-[10px] uppercase tracking-wide text-muted-foreground">
          Avancement
        </span>
      </div>
    </div>
  );
}
