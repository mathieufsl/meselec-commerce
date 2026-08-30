import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CRM_COMMUNES, type CrmCommune } from "@/data/crmCommunes";
import {
  fetchCrmState,
  saveCrmStateMap,
  type CrmCommuneState,
  type CrmStateMap,
} from "@/lib/prospection/crmApi";
import { ProspectionCrmAgendaView } from "@/components/prospection/ProspectionCrmAgendaView";
import { ProspectionCrmCommuneDetailSheet } from "@/components/prospection/ProspectionCrmCommuneDetailSheet";
import { ProspectionCrmCommuneMobileCard } from "@/components/prospection/ProspectionCrmCommuneMobileCard";
import { ProspectionCrmCommuneRow } from "@/components/prospection/ProspectionCrmCommuneRow";
import { ProspectionCrmAssignmentFilterMobile } from "@/components/prospection/ProspectionCrmAssignmentFilter";
import { ProspectionCrmFiltersBar } from "@/components/prospection/ProspectionCrmFiltersBar";
import {
  buildProspectionCrmCommercialTabs,
  ProspectionCrmCommercialTabsDesktop,
} from "@/components/prospection/ProspectionCrmCommercialTabs";
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
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  crmAssignmentFromTab,
  emptyCrmAssignmentFilter,
  isAllCrmAssignment,
  normalizeQuiCible,
  type CrmAssignmentFilter,
  type CrmCommercialTab,
} from "@/lib/prospection/crmUi";
import { useProspectionCrmHeader } from "@/contexts/ProspectionCrmHeaderContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Loader2, MoreVertical, RefreshCw, RotateCcw, Save } from "lucide-react";

export type CrmWorkspaceView = "table" | "agenda";

function defaultRowFor(commune: CrmCommune): CrmCommuneState {
  return {
    quiCible: normalizeQuiCible(commune.quiCible),
    prestataire: "",
    dureeMarche: "",
    dateAttribution: "",
    dateExpiration: "",
    dateRecandidature: "",
    agendaSuivi: "",
    notes: "",
  };
}

const DEFAULT_ROW: CrmCommuneState = {
  quiCible: "",
  prestataire: "",
  dureeMarche: "",
  dateAttribution: "",
  dateExpiration: "",
  dateRecandidature: "",
  agendaSuivi: "",
  notes: "",
};

function rowKey(row: CrmCommuneState): string {
  return [
    row.quiCible,
    row.prestataire,
    row.dureeMarche,
    row.dateAttribution,
    row.dateExpiration,
    row.dateRecandidature,
    row.agendaSuivi,
    row.notes,
  ].join("|");
}

function getChangedRows(current: CrmStateMap, saved: CrmStateMap, communes: CrmCommune[]): CrmStateMap {
  const changed: CrmStateMap = {};
  for (const commune of communes) {
    const cur = current[commune.key] ?? defaultRowFor(commune);
    const prev = saved[commune.key] ?? defaultRowFor(commune);
    if (rowKey(cur) !== rowKey(prev)) {
      changed[commune.key] = cur;
    }
  }
  return changed;
}

const DEPARTEMENTS = [...new Set(CRM_COMMUNES.map((c) => c.departement))].sort();
const AGGLOS = [...new Set(CRM_COMMUNES.map((c) => c.agglo).filter(Boolean))].sort();
const NUANCES = [...new Set(CRM_COMMUNES.map((c) => c.nuance).filter(Boolean))].sort();

export function ProspectionCrmWorkspace({ view }: { view: CrmWorkspaceView }) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { setStats } = useProspectionCrmHeader();
  const [state, setState] = useState<CrmStateMap>({});
  const [savedState, setSavedState] = useState<CrmStateMap>({});
  const stateRef = useRef(state);
  stateRef.current = state;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterDepartement, setFilterDepartement] = useState("");
  const [filterAgglo, setFilterAgglo] = useState("");
  const [filterNuance, setFilterNuance] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<CrmAssignmentFilter>(emptyCrmAssignmentFilter);
  const [filterPop, setFilterPop] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [detailCommune, setDetailCommune] = useState<CrmCommune | null>(null);

  const loadFromServer = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchCrmState();
      setState(data);
      setSavedState(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Impossible de charger les données CRM.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  const getRow = useCallback(
    (commune: CrmCommune): CrmCommuneState => {
      const fromState = state[commune.key];
      if (fromState) {
        return {
          ...fromState,
          quiCible: normalizeQuiCible(fromState.quiCible),
        };
      }
      return defaultRowFor(commune);
    },
    [state],
  );

  const updateRow = useCallback((key: string, patch: Partial<CrmCommuneState>) => {
    const normalizedPatch =
      patch.quiCible !== undefined ? { ...patch, quiCible: normalizeQuiCible(patch.quiCible) } : patch;
    setState((prev) => {
      const commune = CRM_COMMUNES.find((c) => c.key === key);
      const base = commune ? { ...defaultRowFor(commune), ...prev[key] } : { ...DEFAULT_ROW, ...prev[key] };
      return {
        ...prev,
        [key]: { ...base, ...normalizedPatch },
      };
    });
  }, []);

  const changedRows = useMemo(
    () => getChangedRows(state, savedState, CRM_COMMUNES),
    [state, savedState],
  );
  const dirtyKeys = useMemo(() => new Set(Object.keys(changedRows)), [changedRows]);
  const dirty = dirtyKeys.size > 0;

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const toSave = getChangedRows(stateRef.current, savedState, CRM_COMMUNES);
      await saveCrmStateMap(toSave);
      setSavedState((prev) => ({ ...prev, ...toSave }));
      toast({ title: "Enregistré", description: "Les modifications CRM ont été sauvegardées." });
    } catch (err) {
      console.error("CRM save failed:", err);
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
    (c: CrmCommune) => {
      const s = getRow(c);
      const q = search.toLowerCase();
      if (
        q &&
        !c.ville.toLowerCase().includes(q) &&
        !c.maire.toLowerCase().includes(q) &&
        !c.agglo.toLowerCase().includes(q) &&
        !c.departement.toLowerCase().includes(q) &&
        !(normalizeQuiCible(s.quiCible) || "").toLowerCase().includes(q) &&
        !(s.prestataire || "").toLowerCase().includes(q) &&
        !(s.dureeMarche || "").toLowerCase().includes(q) &&
        !(s.agendaSuivi || "").toLowerCase().includes(q) &&
        !(c.email || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (filterDepartement && c.departement !== filterDepartement) return false;
      if (filterAgglo && c.agglo !== filterAgglo) return false;
      if (filterNuance && c.nuance !== filterNuance) return false;
      if (filterPop === "big" && c.habitants < 5000) return false;
      if (filterPop === "med" && (c.habitants < 1000 || c.habitants >= 5000)) return false;
      if (filterPop === "small" && c.habitants >= 1000) return false;
      return true;
    },
    [search, filterDepartement, filterAgglo, filterNuance, filterPop, getRow],
  );

  const baseFiltered = useMemo(
    () => CRM_COMMUNES.filter(matchesBaseFilters),
    [matchesBaseFilters],
  );

  const commercialCounts = useMemo(() => {
    const counts = {
      all: baseFiltered.length,
      unassigned: 0,
      Rida: 0,
      Arnaud: 0,
      Cisse: 0,
      Mohammed: 0,
      Mathieu: 0,
    } satisfies Record<CrmCommercialTab, number>;

    for (const commune of baseFiltered) {
      const cible = normalizeQuiCible(getRow(commune).quiCible);
      if (!cible) {
        counts.unassigned += 1;
      } else {
        counts[cible] += 1;
      }
    }
    return counts;
  }, [baseFiltered, getRow]);

  const filtered = useMemo(() => {
    if (isAllCrmAssignment(assignmentFilter)) return baseFiltered;
    return baseFiltered.filter((c) => {
      const cible = normalizeQuiCible(getRow(c).quiCible);
      const matchUnassigned = assignmentFilter.unassigned && !cible;
      const matchCommercial = Boolean(cible && assignmentFilter.commercials.includes(cible));
      return matchUnassigned || matchCommercial;
    });
  }, [baseFiltered, assignmentFilter, getRow]);

  const commercialTabs = useMemo(
    () =>
      buildProspectionCrmCommercialTabs({
        commercialCounts,
        assignmentFilter,
        onSelectTab: (tab) => setAssignmentFilter(crmAssignmentFromTab(tab)),
      }),
    [commercialCounts, assignmentFilter],
  );

  const stats = useMemo(() => {
    let cibles = 0;
    for (const commune of filtered) {
      if (normalizeQuiCible(getRow(commune).quiCible)) cibles += 1;
    }
    return {
      communes: filtered.length,
      cibles,
      nonCiblees: filtered.length - cibles,
    };
  }, [filtered, getRow]);

  useEffect(() => {
    if (loading) {
      setStats(null);
      return;
    }
    setStats(stats);
    return () => setStats(null);
  }, [loading, stats, setStats]);

  const handleOpenDetail = useCallback((commune: CrmCommune) => {
    setDetailCommune(commune);
  }, []);

  const exportCsv = () => {
    const rows = stateRef.current;
    let csv =
      "Département;Ville;Habitants;Agglomération;Maire;Nuance;Téléphone;Email;Qui cible;Prestataire;Durée marché;Date attribution;Date expiration;Date recandidature;Agenda suivi;Notes\n";
    for (const c of CRM_COMMUNES) {
      const s = { ...defaultRowFor(c), ...rows[c.key] };
      csv += `"${c.departement}";"${c.ville}";${c.habitants};"${c.agglo}";"${c.maire}";"${c.nuance}";"${c.telephone}";"${c.email}";"${s.quiCible}";"${s.prestataire}";"${s.dureeMarche}";"${s.dateAttribution}";"${s.dateExpiration}";"${s.dateRecandidature}";"${s.agendaSuivi}";"${s.notes}"\n`;
    }
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "MESELEC_CRM_Communes_IDF.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearch("");
    setFilterDepartement("");
    setFilterAgglo("");
    setFilterNuance("");
    setAssignmentFilter(emptyCrmAssignmentFilter());
    setFilterPop("");
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
          Vérifiez que la migration CRM communes est appliquée sur Supabase.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadFromServer()}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-full">
      <div className="border-b bg-card lg:space-y-2 lg:px-4 lg:py-2.5 lg:sm:px-5">
        <div className="lg:hidden sticky z-[38] -mx-4 space-y-2 border-b border-border/80 bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/90 [top:var(--admin-mobile-sticky-offset,7.25rem)]">
          <ProspectionCrmFiltersBar
            variant="mobile-sticky"
            search={search}
            onSearchChange={setSearch}
            filterDepartement={filterDepartement}
            onFilterDepartementChange={setFilterDepartement}
            departements={DEPARTEMENTS}
            filterAgglo={filterAgglo}
            onFilterAggloChange={setFilterAgglo}
            agglos={AGGLOS}
            filterNuance={filterNuance}
            onFilterNuanceChange={setFilterNuance}
            nuances={NUANCES}
            filterPop={filterPop}
            onFilterPopChange={setFilterPop}
            mobileFiltersOpen={mobileFiltersOpen}
            onMobileFiltersOpenChange={setMobileFiltersOpen}
          />
          {mobileActionButtons}
        </div>

        <div className="hidden lg:block lg:sticky lg:top-0 lg:z-10 -mx-4 border-b border-border/70 bg-background px-4 pb-2 pt-1 shadow-[0_1px_0_0_hsl(var(--border))] xl:-mx-5 xl:px-5">
          <ProspectionCrmFiltersBar
            variant="desktop"
            search={search}
            onSearchChange={setSearch}
            filterDepartement={filterDepartement}
            onFilterDepartementChange={setFilterDepartement}
            departements={DEPARTEMENTS}
            filterAgglo={filterAgglo}
            onFilterAggloChange={setFilterAgglo}
            agglos={AGGLOS}
            filterNuance={filterNuance}
            onFilterNuanceChange={setFilterNuance}
            nuances={NUANCES}
            filterPop={filterPop}
            onFilterPopChange={setFilterPop}
          >
            <div className="ml-auto flex flex-wrap items-center gap-2">{actionButtons}</div>
          </ProspectionCrmFiltersBar>
          <ProspectionCrmCommercialTabsDesktop tabs={commercialTabs} />
        </div>
      </div>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filtres</SheetTitle>
          </SheetHeader>
          <div className="mt-4 max-h-[calc(85dvh-5rem)] space-y-4 overflow-y-auto pb-2">
            <div className="space-y-2">
              <Label>Département</Label>
              <Select
                value={filterDepartement || "__all__"}
                onValueChange={(v) => setFilterDepartement(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous départements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous départements</SelectItem>
                  {DEPARTEMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
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
                  <SelectValue placeholder="Toutes agglomérations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes agglomérations</SelectItem>
                  {AGGLOS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nuance</Label>
              <Select
                value={filterNuance || "__all__"}
                onValueChange={(v) => setFilterNuance(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes nuances" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes nuances</SelectItem>
                  {NUANCES.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
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
            <ProspectionCrmAssignmentFilterMobile
              filter={assignmentFilter}
              onChange={setAssignmentFilter}
              commercialCounts={commercialCounts}
            />
            <Button type="button" className="w-full" onClick={() => setMobileFiltersOpen(false)}>
              Appliquer
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
        {!isMobile && view === "agenda" ? (
          <ProspectionCrmAgendaView
            communes={filtered}
            getRow={getRow}
            dirtyKeys={dirtyKeys}
            onOpenDetail={handleOpenDetail}
          />
        ) : isMobile ? (
          <div className="space-y-2 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            {filtered.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Aucune commune trouvée.</p>
            ) : (
              filtered.map((c) => (
                <ProspectionCrmCommuneMobileCard
                  key={c.key}
                  commune={c}
                  row={getRow(c)}
                  isDirty={dirtyKeys.has(c.key)}
                  onOpenDetail={handleOpenDetail}
                />
              ))
            )}
          </div>
        ) : (
          <Table className="table-fixed w-full">
            <colgroup>
              <col className="w-[2%]" />
              <col className="w-[3%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[5%]" />
              <col className="w-[9%]" />
              <col className="w-[15%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[13%]" />
            </colgroup>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow className="text-[11px]">
                <TableHead className="px-0.5 py-1.5">#</TableHead>
                <TableHead className="px-1 py-1.5">Dép.</TableHead>
                <TableHead className="px-1.5 py-1.5">Commune</TableHead>
                <TableHead className="px-1.5 py-1.5">Agglomération</TableHead>
                <TableHead className="px-1.5 py-1.5">Maire</TableHead>
                <TableHead className="px-1 py-1.5 text-center">Nuance</TableHead>
                <TableHead className="px-1.5 py-1.5">Téléphone</TableHead>
                <TableHead className="px-1.5 py-1.5">Email</TableHead>
                <TableHead className="px-1 py-1.5">Qui cible ?</TableHead>
                <TableHead className="px-1 py-1.5">Prestataire</TableHead>
                <TableHead className="px-1 py-1.5">Détail marché</TableHead>
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
                  <ProspectionCrmCommuneRow
                    key={c.key}
                    index={i + 1}
                    commune={c}
                    row={getRow(c)}
                    isDirty={dirtyKeys.has(c.key)}
                    onPatch={updateRow}
                    onOpenDetail={handleOpenDetail}
                  />
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <ProspectionCrmCommuneDetailSheet
        open={detailCommune !== null}
        onOpenChange={(open) => {
          if (!open) setDetailCommune(null);
        }}
        commune={detailCommune}
        row={detailCommune ? getRow(detailCommune) : DEFAULT_ROW}
        isDirty={detailCommune ? dirtyKeys.has(detailCommune.key) : false}
        onPatch={updateRow}
      />
    </div>
  );
}
