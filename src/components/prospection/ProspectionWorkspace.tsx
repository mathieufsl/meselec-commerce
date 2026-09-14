import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PROSPECTION_COMMUNES, PROSPECTION_DEPARTEMENTS } from "@/data/prospectionCommunes";
import {
  fetchProspectionState,
  saveProspectionStateMap,
  type ProspectionCommuneState,
  type ProspectionStateMap,
} from "@/lib/prospection/api";
import { summarizeContacts } from "@/lib/prospection/contacts";
import { ProspectionCommuneDetailSheet } from "@/components/prospection/ProspectionCommuneDetailSheet";
import { ProspectionCommuneMobileCard } from "@/components/prospection/ProspectionCommuneMobileCard";
import { ProspectionScriptsModal } from "@/components/prospection/ProspectionScriptsModal";
import { ProspectionCommuneRow } from "@/components/prospection/ProspectionCommuneRow";
import { ProspectionFiltersBar } from "@/components/prospection/ProspectionFiltersBar";
import {
  buildProspectionStatusTabs,
  ProspectionStatusTabsDesktop,
  ProspectionStatusTabsMobileScroll,
  type ProspectionStatusTab,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Download, FileText, Loader2, MoreVertical, RefreshCw, RotateCcw, Save } from "lucide-react";
import { useProspectionSearchParams } from "@/hooks/useProspectionSearchParams";

const DEFAULT_ROW: ProspectionCommuneState = {
  status: "todo",
  gestion: "",
  prestataire: "",
  contact: "",
  contacts: [],
  notes: "",
};
const STATUS_TABS: ProspectionStatusTab[] = ["all", "todo", "inprogress", "done", "callback", "refused"];
const POP_FILTERS = new Set(["", "big", "med", "small"]);

type ProspectionListFilters = {
  search: string;
  filterDepartement: string;
  filterAgglo: string;
  filterPop: string;
  statusTab: ProspectionStatusTab;
};

function parseProspectionFilters(params: URLSearchParams): ProspectionListFilters {
  const pop = params.get("pop") ?? "";
  const status = params.get("status") as ProspectionStatusTab | null;
  return {
    search: params.get("q") ?? "",
    filterDepartement: params.get("dep") ?? "",
    filterAgglo: params.get("agglo") ?? "",
    filterPop: POP_FILTERS.has(pop) ? pop : "",
    statusTab: status && STATUS_TABS.includes(status) ? status : "all",
  };
}

function buildProspectionSearchParams(filters: ProspectionListFilters): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.search.trim()) next.set("q", filters.search.trim());
  if (filters.filterDepartement) next.set("dep", filters.filterDepartement);
  if (filters.filterAgglo) next.set("agglo", filters.filterAgglo);
  if (filters.filterPop) next.set("pop", filters.filterPop);
  if (filters.statusTab !== "all") next.set("status", filters.statusTab);
  return next;
}

function prospectionFiltersEqual(a: ProspectionListFilters, b: ProspectionListFilters): boolean {
  return (
    a.search === b.search &&
    a.filterDepartement === b.filterDepartement &&
    a.filterAgglo === b.filterAgglo &&
    a.filterPop === b.filterPop &&
    a.statusTab === b.statusTab
  );
}

function rowKey(row: ProspectionCommuneState): string {
  return `${row.status}|${row.gestion}|${row.prestataire}|${summarizeContacts(row.contacts)}|${row.notes}`;
}

function getChangedRows(
  current: ProspectionStateMap,
  saved: ProspectionStateMap,
  communes: typeof PROSPECTION_COMMUNES,
): ProspectionStateMap {
  const changed: ProspectionStateMap = {};
  for (const commune of communes) {
    const cur = current[commune.key] ?? DEFAULT_ROW;
    const prev = saved[commune.key] ?? DEFAULT_ROW;
    if (rowKey(cur) !== rowKey(prev)) {
      changed[commune.key] = cur;
    }
  }
  return changed;
}

type ScriptTarget = { ville: string; agglo: string; maire: string } | null;

export function ProspectionWorkspace() {
  const [searchParams, setSearchParams] = useProspectionSearchParams();
  const initialFilters = useRef(parseProspectionFilters(searchParams));
  const syncedFiltersRef = useRef(initialFilters.current);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [state, setState] = useState<ProspectionStateMap>({});
  const [savedState, setSavedState] = useState<ProspectionStateMap>({});
  const stateRef = useRef(state);
  stateRef.current = state;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialFilters.current.search);
  const [filterDepartement, setFilterDepartement] = useState(initialFilters.current.filterDepartement);
  const [filterAgglo, setFilterAgglo] = useState(initialFilters.current.filterAgglo);
  const [filterPop, setFilterPop] = useState(initialFilters.current.filterPop);
  const [statusTab, setStatusTab] = useState<ProspectionStatusTab>(initialFilters.current.statusTab);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [scriptsOpen, setScriptsOpen] = useState(false);
  const [scriptTarget, setScriptTarget] = useState<ScriptTarget>(null);
  const [detailCommune, setDetailCommune] = useState<ProspectionCommune | null>(null);

  const agglos = useMemo(() => {
    const source = filterDepartement
      ? PROSPECTION_COMMUNES.filter((c) => c.departement === filterDepartement)
      : PROSPECTION_COMMUNES;
    return [...new Set(source.map((c) => c.agglo).filter(Boolean))].sort();
  }, [filterDepartement]);

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

  const loadFromServer = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchProspectionState();
      setState(data);
      setSavedState(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Impossible de charger les données prospection.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  const updateRow = useCallback((communeKey: string, patch: Partial<ProspectionCommuneState>) => {
    setState((prev) => {
      const next = { ...DEFAULT_ROW, ...prev[communeKey], ...patch };
      if (patch.contacts) {
        next.contact = summarizeContacts(patch.contacts);
      }
      return { ...prev, [communeKey]: next };
    });
  }, []);

  const changedRows = useMemo(
    () => getChangedRows(state, savedState, PROSPECTION_COMMUNES),
    [state, savedState],
  );
  const dirtyKeys = useMemo(() => new Set(Object.keys(changedRows)), [changedRows]);
  const dirty = dirtyKeys.size > 0;

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const toSave = getChangedRows(stateRef.current, savedState, PROSPECTION_COMMUNES);
      await saveProspectionStateMap(toSave);
      setSavedState((prev) => ({ ...prev, ...toSave }));
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

  const matchesBaseFilters = useCallback(
    (c: ProspectionCommune) => {
      const s = state[c.key] ?? DEFAULT_ROW;
      const q = search.toLowerCase();
      if (
        q &&
        !c.ville.toLowerCase().includes(q) &&
        !c.maire.toLowerCase().includes(q) &&
        !c.agglo.toLowerCase().includes(q) &&
        !c.departement.toLowerCase().includes(q) &&
        !(s.prestataire || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (filterDepartement && c.departement !== filterDepartement) return false;
      if (filterAgglo && c.agglo !== filterAgglo) return false;
      if (filterPop === "big" && c.habitants < 5000) return false;
      if (filterPop === "med" && (c.habitants < 1000 || c.habitants >= 5000)) return false;
      if (filterPop === "small" && c.habitants >= 1000) return false;
      return true;
    },
    [search, filterDepartement, filterAgglo, filterPop, state],
  );

  const baseFiltered = useMemo(
    () => PROSPECTION_COMMUNES.filter(matchesBaseFilters),
    [matchesBaseFilters],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<ProspectionStatusTab, number> = {
      all: baseFiltered.length,
      todo: 0,
      inprogress: 0,
      done: 0,
      callback: 0,
      refused: 0,
    };
    for (const c of baseFiltered) {
      const status = (state[c.key] ?? DEFAULT_ROW).status;
      counts[status] += 1;
    }
    return counts;
  }, [baseFiltered, state]);

  const filtered = useMemo(() => {
    if (statusTab === "all") return baseFiltered;
    return baseFiltered.filter((c) => (state[c.key] ?? DEFAULT_ROW).status === statusTab);
  }, [baseFiltered, statusTab, state]);

  const statusTabs = useMemo(
    () =>
      buildProspectionStatusTabs({
        statusCounts,
        statusTab,
        onSelectTab: setStatusTab,
      }),
    [statusCounts, statusTab],
  );

  const stats = useMemo(() => {
    const done = baseFiltered.filter((c) => (state[c.key] ?? DEFAULT_ROW).status === "done").length;
    const todo = baseFiltered.filter((c) => (state[c.key] ?? DEFAULT_ROW).status === "todo").length;
    const pct = baseFiltered.length > 0 ? Math.round((done / baseFiltered.length) * 100) : 0;
    return { done, todo, pct, total: baseFiltered.length };
  }, [baseFiltered, state]);

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
    for (const c of baseFiltered) {
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

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des données…
      </div>
    );
  }

  if (loadError) {
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
            departements={PROSPECTION_DEPARTEMENTS}
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
            departements={PROSPECTION_DEPARTEMENTS}
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
                  {PROSPECTION_DEPARTEMENTS.map((dep) => (
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

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
        {isMobile ? (
          <div className="space-y-2 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            {filtered.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Aucune commune trouvée.</p>
            ) : (
              filtered.map((c) => (
                <ProspectionCommuneMobileCard
                  key={c.key}
                  commune={c}
                  row={state[c.key] ?? DEFAULT_ROW}
                  isDirty={dirtyKeys.has(c.key)}
                  onOpenDetail={handleOpenDetail}
                />
              ))
            )}
          </div>
        ) : (
          <Table className="table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                <TableHead className="w-9 px-2">#</TableHead>
                <TableHead className="w-[4%] px-2">Dép.</TableHead>
                <TableHead className="w-[11%] px-2">Commune</TableHead>
                <TableHead className="w-[13%] px-2">Agglomération</TableHead>
                <TableHead className="w-[10%] px-2">Maire</TableHead>
                <TableHead className="w-[8%] px-2">Qui gère EP ?</TableHead>
                <TableHead className="w-[8%] px-2">Statut</TableHead>
                <TableHead className="w-[10%] px-2">Prestataire</TableHead>
                <TableHead className="w-[10%] px-2">Contact</TableHead>
                <TableHead className="w-[11%] px-2">Notes</TableHead>
                <TableHead className="w-10 px-2">Script</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-16 text-center text-muted-foreground">
                    Aucune commune trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c, i) => (
                  <ProspectionCommuneRow
                    key={c.key}
                    index={i + 1}
                    commune={c}
                    row={state[c.key] ?? DEFAULT_ROW}
                    isDirty={dirtyKeys.has(c.key)}
                    onPatch={updateRow}
                    onOpenScript={handleOpenScript}
                    onOpenDetail={handleOpenDetail}
                  />
                ))
              )}
            </TableBody>
          </Table>
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
