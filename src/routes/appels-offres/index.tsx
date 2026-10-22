import { useEffect, useMemo, useState, type UIEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/components/commerce/AppShell";
import { AoCreateWizard } from "@/components/commerce/AoCreateWizard";
import { AoDetailSheet } from "@/components/commerce/AoDetailSheet";
import { CommerceAoCard } from "@/components/commerce/CommerceAoCard";
import { CommerceAoDateFilters } from "@/components/commerce/CommerceAoDateFilters";
import { CommerceAoKanban } from "@/components/commerce/CommerceAoKanban";
import { CommerceAoSecteurFilter } from "@/components/commerce/CommerceAoSecteurFilter";
import { CommerceKpiBar, type CommerceKpiKey } from "@/components/commerce/CommerceKpiBar";
import {
  AoSecteurBadges,
  CommerceSecteurKpiBar,
} from "@/components/commerce/CommerceSecteurKpiBar";
import { CommerceStatusTabs, type AoStatutTab } from "@/components/commerce/CommerceStatusTabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useAppelsOffres,
  useAoDocumentCounts,
  useCommerceSettings,
  useSocietes,
  useUpsertAppelOffre,
} from "@/hooks/useCommerceData";
import { matchesAoSocieteFilter, useAoSocieteFilter } from "@/hooks/useAoSocieteFilter";
import { useCommerceAuth } from "@/hooks/useCommerceAuth";
import { AO_STATUT_LABELS, AO_STATUTS, type AoSecteurCode, type AoStatut } from "@/lib/commerceTypes";
import { AO_STATUT_STYLES } from "@/lib/aoStatusStyles";
import { matchesAoDateFilter, matchesAoSecteurFilter, type AoDateFilterPreset } from "@/lib/aoFilters";
import { daysUntil, formatEuro } from "@/lib/bpuEngine";
import { cleanDisplaySeparators } from "@/lib/displayText";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AppelOffre } from "@/lib/commerceTypes";
import { aoAnnonceUrl } from "@/lib/aoAnnonceUrl";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import {
  Briefcase,
  Columns3,
  ExternalLink,
  LayoutList,
  Paperclip,
  Radar,
  Search,
  SlidersHorizontal,
} from "lucide-react";

type AoViewMode = "liste" | "kanban";

type AoColumnKey =
  | "client"
  | "secteurs"
  | "reference"
  | "objet"
  | "statut"
  | "docs"
  | "date"
  | "montant";

const AO_TABLE_COLUMNS: Array<{
  key: AoColumnKey;
  label: string;
  width: number;
  align?: "center" | "right";
}> = [
  { key: "client", label: "Client", width: 260 },
  { key: "secteurs", label: "Secteur(s)", width: 130 },
  { key: "reference", label: "Réf.", width: 170 },
  { key: "objet", label: "Lieu / Objet", width: 320 },
  { key: "statut", label: "Statut", width: 120 },
  { key: "docs", label: "Docs", width: 70, align: "center" },
  { key: "date", label: "Date limite", width: 130 },
  { key: "montant", label: "Montant", width: 130, align: "right" },
];

const AO_COLUMN_DEFAULT_WIDTHS = Object.fromEntries(
  AO_TABLE_COLUMNS.map((c) => [c.key, c.width]),
) as Record<AoColumnKey, number>;

/** Première colonne figée lors du défilement horizontal. */
const STICKY_FIRST_COL =
  "sticky left-0 z-[5] bg-card after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border";

/** État de vue conservé pendant la session (retour depuis le détail d'un AO). */
function useSessionState<T>(key: string, initial: T) {
  const storageKey = `ao-list:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* stockage indisponible */
    }
  }, [storageKey, value]);
  return [value, setValue] as const;
}

export const Route = createFileRoute("/appels-offres/")({
  component: AppelsOffresPage,
});

function AppelsOffresPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasEditorAccess } = useCommerceAuth();
  const canEdit = hasEditorAccess("appels_offres");
  const { data: aos = [], isLoading } = useAppelsOffres();
  const { data: docCounts = {} } = useAoDocumentCounts();
  const { data: societes = [] } = useSocietes();
  const { selectedSocieteId } = useAoSocieteFilter();
  const { data: settings } = useCommerceSettings();
  const upsert = useUpsertAppelOffre();
  const [filter, setFilter] = useSessionState("filter", "");
  const [statutTab, setStatutTab] = useSessionState<AoStatutTab>("statutTab", "all");
  const [kpiFilter, setKpiFilter] = useSessionState<CommerceKpiKey | null>("kpiFilter", null);
  const [viewMode, setViewMode] = useSessionState<AoViewMode>("viewMode", "liste");
  const [dateMax, setDateMax] = useSessionState("dateMax", "");
  const [datePreset, setDatePreset] = useSessionState<AoDateFilterPreset | null>("datePreset", null);
  const [secteurFilter, setSecteurFilter] = useSessionState<AoSecteurCode[]>("secteurFilter", []);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailAoId, setDetailAoId] = useState<string | null>(null);
  const {
    widths: colWidths,
    totalWidth: totalColWidth,
    startResize: startColResize,
    resetColumn: resetColWidth,
  } = useResizableColumns("ao-list:col-widths", AO_COLUMN_DEFAULT_WIDTHS);
  // Les KPI se replient dès qu'on fait défiler la liste, pour laisser la place aux lignes.
  const [kpisCollapsed, setKpisCollapsed] = useState(false);

  useEffect(() => {
    setKpisCollapsed(false);
  }, [viewMode]);

  function handleListScroll(e: UIEvent<HTMLElement>) {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Ne replier que si la liste reste défilable une fois les KPI masqués (évite le clignotement).
    if (scrollTop > 40 && scrollHeight - clientHeight > 320) setKpisCollapsed(true);
    else if (scrollTop < 4) setKpisCollapsed(false);
  }

  function openAoDetail(ao: AppelOffre) {
    if (isMobile) {
      setDetailAoId(ao.id);
    } else {
      void navigate({ to: "/appels-offres/$aoId", params: { aoId: ao.id } });
    }
  }

  const activeFilterCount =
    (datePreset || dateMax ? 1 : 0) +
    (secteurFilter.length > 0 ? 1 : 0) +
    (viewMode === "kanban" ? 1 : 0) +
    (statutTab !== "all" ? 1 : 0);

  const defaultSocieteId =
    selectedSocieteId !== "all" ? selectedSocieteId : (societes[0]?.id ?? "");

  const scopedAos = useMemo(
    () => aos.filter((ao) => matchesAoSocieteFilter(ao.societe_attribuee_id, selectedSocieteId)),
    [aos, selectedSocieteId],
  );

  const actifs = scopedAos.filter((a) => !["gagne", "perdu", "abandonne"].includes(a.statut));
  const montantPipeline = actifs.reduce((s, a) => s + (a.montant_estime ?? 0), 0);
  const gagnes = scopedAos.filter((a) => a.statut === "gagne");
  const montantGagne = gagnes.reduce((s, a) => s + (a.montant_estime ?? 0), 0);

  const statusCounts = useMemo(() => {
    const counts: Record<AoStatutTab, number> = {
      all: scopedAos.length,
      non_traite: 0,
      analyse: 0,
      en_cours: 0,
      depose: 0,
      gagne: 0,
      perdu: 0,
      abandonne: 0,
      supprime: 0,
    };
    for (const ao of scopedAos) counts[ao.statut as AoStatut]++;
    return counts;
  }, [scopedAos]);

  const filtered = scopedAos.filter((ao) => {
    const q = filter.toLowerCase();
    const donneur = ao.donneur_ordre_libre ?? ao.clients?.nom_entreprise ?? "";
    const matchSearch =
      !q ||
      ao.reference.toLowerCase().includes(q) ||
      ao.titre.toLowerCase().includes(q) ||
      donneur.toLowerCase().includes(q);
    const matchTab = statutTab === "all" || ao.statut === statutTab;
    const matchKpi =
      !kpiFilter ||
      (kpiFilter === "pipeline" && !["gagne", "perdu", "abandonne"].includes(ao.statut)) ||
      (kpiFilter === "montant" && !["gagne", "perdu", "abandonne"].includes(ao.statut)) ||
      (kpiFilter === "gagnes" && ao.statut === "gagne");
    const matchDate = matchesAoDateFilter(ao.date_limite_depot, dateMax, datePreset);
    const secteurCodes = (ao.ao_secteurs ?? []).map((s) => s.secteur);
    const matchSecteur = matchesAoSecteurFilter(secteurCodes, secteurFilter);
    return matchSearch && matchTab && matchKpi && matchDate && matchSecteur;
  });

  const mobileGroups = useMemo(
    () =>
      AO_STATUTS.map((statut) => ({
        statut,
        items: filtered.filter((ao) => ao.statut === statut),
      })).filter((g) => g.items.length > 0),
    [filtered],
  );

  const syncLabel = settings?.last_erp_sync_at
    ? new Date(settings.last_erp_sync_at).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  async function moveAoStatut(aoId: string, statut: AoStatut) {
    if (!canEdit) return;
    await upsert.mutateAsync({ id: aoId, statut });
  }

  const viewToggle = (
    <ToggleGroup
      type="single"
      value={viewMode}
      onValueChange={(v) => v && setViewMode(v as AoViewMode)}
      className="shrink-0 rounded-lg border border-border/70 bg-card p-0.5"
    >
      <ToggleGroupItem
        value="liste"
        aria-label="Vue liste"
        className="h-8 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <LayoutList className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Liste</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="kanban"
        aria-label="Vue kanban"
        className="h-8 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Columns3 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Kanban</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );

  return (
    <>
      <AppShell
        title="Appels d'offres"
        titleIcon={Briefcase}
        flush
        syncLabel={syncLabel}
        primaryAction={
          canEdit ? { label: "Créer un AO", onClick: () => setWizardOpen(true) } : undefined
        }
        inlineAction={
          <Button variant="outline" size="sm" className="h-9 gap-2 px-3 sm:h-8" asChild>
            <Link to="/veille">
              <Radar className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Veille AO</span>
            </Link>
          </Button>
        }
        headerExtra={<div className="hidden sm:block">{viewToggle}</div>}
        contentClassName="flex min-h-0 flex-col overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              "grid shrink-0 transition-[grid-template-rows,opacity] duration-200 ease-out",
              kpisCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
            )}
            aria-hidden={kpisCollapsed}
          >
          <div className="min-h-0 overflow-hidden">
          <div className="px-3 pb-1 pt-1 sm:px-6">
            <CommerceKpiBar
              pipelineCount={actifs.length}
              montantPipeline={montantPipeline}
              gagnesCount={gagnes.length}
              montantGagne={montantGagne}
              active={kpiFilter}
              onToggle={(k) => setKpiFilter((prev) => (prev === k ? null : k))}
            />
            <CommerceSecteurKpiBar
              aos={scopedAos}
              activeSecteur={secteurFilter.length === 1 ? secteurFilter[0]! : null}
              onToggleSecteur={(code) =>
                setSecteurFilter((prev) =>
                  prev.length === 1 && prev[0] === code ? [] : [code],
                )
              }
            />
          </div>
          </div>
          </div>

          <div className="sticky top-0 z-10 shrink-0 border-b border-border/70 bg-background px-3 pb-0 pt-1 shadow-[0_1px_0_0_hsl(var(--border))] sm:px-6">
            <div className="mb-2 flex items-center gap-2 md:hidden">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="h-9 bg-background pl-8 text-sm"
                />
              </div>
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="relative h-9 shrink-0 gap-1.5 px-2.5 md:hidden">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtres
                    {activeFilterCount > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-xl">
                  <SheetHeader>
                    <SheetTitle>Filtres</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4 overflow-y-auto pb-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Affichage</p>
                      {viewToggle}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Statut</p>
                      <CommerceStatusTabs
                        variant="chips"
                        active={statutTab}
                        counts={statusCounts}
                        onChange={setStatutTab}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Échéance</p>
                      <CommerceAoDateFilters
                        dateMax={dateMax}
                        preset={datePreset}
                        onDateMaxChange={setDateMax}
                        onPresetChange={setDatePreset}
                        onClear={() => {
                          setDateMax("");
                          setDatePreset(null);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Secteurs</p>
                      <CommerceAoSecteurFilter selected={secteurFilter} onChange={setSecteurFilter} />
                    </div>
                    <Button className="w-full" onClick={() => setFiltersOpen(false)}>
                      Appliquer
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="mb-2 hidden flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2 md:flex">
              <div className="relative w-full sm:w-[280px] lg:w-[320px] xl:w-[360px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher référence, titre, client…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="h-9 bg-background pl-9"
                />
              </div>
              <CommerceAoDateFilters
                dateMax={dateMax}
                preset={datePreset}
                onDateMaxChange={setDateMax}
                onPresetChange={setDatePreset}
                onClear={() => {
                  setDateMax("");
                  setDatePreset(null);
                }}
              />
              <div className="hidden h-6 w-px bg-border/80 lg:block" />
              <CommerceAoSecteurFilter selected={secteurFilter} onChange={setSecteurFilter} />
            </div>
            {viewMode === "liste" ? (
              <div className="hidden md:block">
                <CommerceStatusTabs active={statutTab} counts={statusCounts} onChange={setStatutTab} />
              </div>
            ) : null}
          </div>

          {viewMode === "kanban" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {isLoading ? (
                <p className="px-4 py-4 text-sm text-muted-foreground sm:px-6">Chargement…</p>
              ) : filtered.length === 0 ? (
                <div className="mx-4 mt-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground sm:mx-6">
                  Aucun appel d&apos;offres pour ce filtre.
                </div>
              ) : (
                <CommerceAoKanban
                  items={filtered}
                  docCounts={docCounts}
                  onMoveStatut={moveAoStatut}
                  isMoving={upsert.isPending}
                  {...(isMobile ? { onCardSelect: openAoDetail } : {})}
                />
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div
                className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-2 md:hidden"
                onScroll={handleListScroll}
              >
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : filtered.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Aucun appel d&apos;offres pour ce filtre.
                  </div>
                ) : (
                  mobileGroups.map((group) => (
                    <section key={group.statut} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn("h-2 w-2 rounded-full", AO_STATUT_STYLES[group.statut].dot)}
                        />
                        <h3 className="text-xs font-semibold text-muted-foreground">
                          {AO_STATUT_LABELS[group.statut]}
                        </h3>
                        <span className="rounded-full bg-muted px-1.5 text-xs font-semibold tabular-nums text-foreground/70">
                          {group.items.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.items.map((ao) => (
                          <CommerceAoCard
                            key={ao.id}
                            ao={ao}
                            statut={group.statut}
                            onSelect={openAoDetail}
                            {...(docCounts[ao.id] !== undefined ? { docCount: docCounts[ao.id] } : {})}
                          />
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>

              <Card className="mx-4 mt-2 hidden min-h-0 flex-1 flex-col shadow-sm sm:mx-6 md:flex">
                <div className="shrink-0 border-b px-3 py-2 text-sm text-muted-foreground">
                  {filtered.length} appel(s) d&apos;offres
                </div>
                <CardContent className="min-h-0 flex-1 overflow-y-auto p-0" onScroll={handleListScroll}>
                {isLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
                ) : filtered.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Aucun appel d&apos;offres pour ce filtre.
                  </p>
                ) : (
                  <table
                    className="table-fixed text-sm"
                    style={{ width: totalColWidth, minWidth: "100%" }}
                  >
                    <colgroup>
                      {AO_TABLE_COLUMNS.map((col) => (
                        <col key={col.key} style={{ width: colWidths[col.key] }} />
                      ))}
                      <col />
                    </colgroup>
                    <thead className="sticky top-0 z-10 border-b bg-card">
                      <tr className="text-xs text-muted-foreground">
                        {AO_TABLE_COLUMNS.map((col, i) => (
                          <th
                            key={col.key}
                            className={cn(
                              "relative truncate px-3 py-2 font-semibold",
                              col.align === "center"
                                ? "text-center"
                                : col.align === "right"
                                  ? "text-right"
                                  : "text-left",
                              i === 0 && STICKY_FIRST_COL,
                            )}
                          >
                            {col.label}
                            <span
                              role="separator"
                              aria-orientation="vertical"
                              title="Glisser pour redimensionner · double-clic pour réinitialiser"
                              className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none select-none hover:bg-primary/30"
                              onPointerDown={(e) => startColResize(col.key, e)}
                              onDoubleClick={() => resetColWidth(col.key)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </th>
                        ))}
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((ao) => {
                        const days = daysUntil(ao.date_limite_depot);
                        const donneur = ao.donneur_ordre_libre ?? ao.clients?.nom_entreprise;
                        const secteurCodes = (ao.ao_secteurs ?? []).map((s) => s.secteur);
                        const annonceUrl = aoAnnonceUrl(ao);
                        return (
                          <tr
                            key={ao.id}
                            className="group cursor-pointer border-b transition-colors hover:bg-muted/50"
                            onClick={() =>
                              navigate({ to: "/appels-offres/$aoId", params: { aoId: ao.id } })
                            }
                          >
                            <td
                              className={cn(
                                "truncate px-3 py-2 font-medium",
                                STICKY_FIRST_COL,
                                "transition-colors group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]",
                              )}
                              title={donneur ?? undefined}
                            >
                              {donneur ?? ""}
                            </td>
                            <td className="overflow-hidden px-3 py-2">
                              <AoSecteurBadges secteurs={secteurCodes} />
                            </td>
                            <td className="truncate px-3 py-2">
                              {annonceUrl ? (
                                <a
                                  href={annonceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Ouvrir l'annonce du marché"
                                  className="inline-flex max-w-full items-center gap-1 font-medium text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="truncate">{ao.reference}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              ) : (
                                <Link
                                  to="/appels-offres/$aoId"
                                  params={{ aoId: ao.id }}
                                  className="font-medium text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {ao.reference}
                                </Link>
                              )}
                            </td>
                            <td className="px-3 py-2" title={cleanDisplaySeparators(ao.titre)}>
                              <p className="truncate font-medium">{cleanDisplaySeparators(ao.titre)}</p>
                              {ao.lieu ? (
                                <p className="truncate text-xs text-muted-foreground">{ao.lieu}</p>
                              ) : null}
                            </td>
                            <td className="truncate px-3 py-2">
                              <StatusBadge statut={ao.statut} labels={AO_STATUT_LABELS} />
                            </td>
                            <td className="truncate px-3 py-2 text-center">
                              {docCounts[ao.id] ? (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Paperclip className="h-3.5 w-3.5" />
                                  {docCounts[ao.id]}
                                </span>
                              ) : (
                                ""
                              )}
                            </td>
                            <td
                              className={cn(
                                "truncate px-3 py-2 tabular-nums",
                                days != null &&
                                  days <= 7 &&
                                  ao.statut !== "gagne" &&
                                  "font-medium text-[var(--color-accent)]",
                              )}
                            >
                              {ao.date_limite_depot
                                ? new Date(ao.date_limite_depot).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : ""}
                            </td>
                            <td className="truncate px-3 py-2 text-right font-medium tabular-nums">
                              {formatEuro(ao.montant_estime)}
                            </td>
                            <td />
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="hidden shrink-0 items-center justify-between border-t px-4 py-1.5 text-[11px] text-muted-foreground sm:flex sm:px-6">
            <span>
              {filtered.length} élément(s)
              {viewMode === "kanban" ? " · glisser-déposer pour changer le statut" : ""}
              {syncLabel ? ` · Sync ERP ${syncLabel}` : ""}
            </span>
          </div>
        </div>
      </AppShell>

      <AoCreateWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        defaultSocieteId={defaultSocieteId}
      />

      <AoDetailSheet
        aoId={detailAoId}
        open={detailAoId != null}
        onOpenChange={(open) => {
          if (!open) setDetailAoId(null);
        }}
      />
    </>
  );
}
