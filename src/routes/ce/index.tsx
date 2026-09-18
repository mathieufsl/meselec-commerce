import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/commerce/AppShell";
import { CeCard } from "@/components/commerce/CeCard";
import { CeCreateWizard } from "@/components/commerce/CeCreateWizard";
import { CeDetailSheet } from "@/components/commerce/CeDetailSheet";
import { CeSituationKpiBar } from "@/components/commerce/CeSituationKpiBar";
import { CeStatusTabs, type CeStatutTab } from "@/components/commerce/CeStatusTabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCeDossiers } from "@/hooks/useCeData";
import { useCommerceAuth } from "@/hooks/useCommerceAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CE_SITUATION_LABELS,
  CE_SITUATIONS,
  CE_STATUT_LABELS,
  CE_STATUTS,
  type CeDossier,
  type CeSituationJuridique,
  type CeStatut,
} from "@/lib/commerceTypes";
import { CE_SITUATION_STYLES, CE_STATUT_STYLES } from "@/lib/ceStatusStyles";
import { formatEuro } from "@/lib/bpuEngine";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/ce/")({
  component: CeListPage,
});

function CeListPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasEditorAccess } = useCommerceAuth();
  const canEdit = hasEditorAccess("ce");
  const { data: dossiers = [], isLoading } = useCeDossiers();

  const [filter, setFilter] = useState("");
  const [statutTab, setStatutTab] = useState<CeStatutTab>("all");
  const [situationFilter, setSituationFilter] = useState<CeSituationJuridique[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  function openDetail(dossier: CeDossier) {
    if (isMobile) {
      setDetailId(dossier.id);
    } else {
      void navigate({ to: "/ce/$dossierId", params: { dossierId: dossier.id } });
    }
  }

  const actifs = dossiers.filter((d) => !["acquis", "abandonne"].includes(d.statut));
  const valorisationPipeline = actifs.reduce(
    (s, d) => s + (d.valorisation_estimee ?? 0),
    0,
  );
  const acquis = dossiers.filter((d) => d.statut === "acquis");

  const statusCounts = useMemo(() => {
    const counts: Record<CeStatutTab, number> = {
      all: dossiers.length,
      detection: 0,
      analyse: 0,
      offre: 0,
      negociation: 0,
      closing: 0,
      acquis: 0,
      abandonne: 0,
    };
    for (const d of dossiers) counts[d.statut as CeStatut]++;
    return counts;
  }, [dossiers]);

  const filtered = dossiers.filter((d) => {
    const q = filter.toLowerCase();
    const matchSearch =
      !q ||
      d.reference.toLowerCase().includes(q) ||
      d.nom_cible.toLowerCase().includes(q) ||
      (d.activite ?? "").toLowerCase().includes(q);
    const matchTab = statutTab === "all" || d.statut === statutTab;
    const matchSituation =
      situationFilter.length === 0 || situationFilter.includes(d.situation_juridique);
    return matchSearch && matchTab && matchSituation;
  });

  const mobileGroups = useMemo(
    () =>
      CE_STATUTS.map((statut) => ({
        statut,
        items: filtered.filter((d) => d.statut === statut),
      })).filter((g) => g.items.length > 0),
    [filtered],
  );

  const activeFilterCount =
    (situationFilter.length > 0 ? 1 : 0) + (statutTab !== "all" ? 1 : 0);

  const activeSituation =
    situationFilter.length === 1 ? situationFilter[0]! : null;

  function toggleSituationFromBar(code: CeSituationJuridique) {
    setSituationFilter((prev) =>
      prev.length === 1 && prev[0] === code ? [] : [code],
    );
  }

  return (
    <>
      <AppShell
        title="Croissance externe"
        titleIcon={TrendingUp}
        flush
        primaryAction={
          canEdit ? { label: "Nouveau dossier", onClick: () => setWizardOpen(true) } : undefined
        }
        contentClassName="flex min-h-0 flex-col overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 px-3 pb-1 pt-1 sm:px-6">
            <div className="grid grid-cols-3 gap-1.5 pb-2">
              <KpiTile label="Actifs" value={String(actifs.length)} accent="blue" />
              <KpiTile
                label="Valorisation"
                value={formatEuro(valorisationPipeline)}
                accent="amber"
              />
              <KpiTile label="Acquis" value={String(acquis.length)} accent="emerald" />
            </div>
            <CeSituationKpiBar
              dossiers={dossiers}
              activeSituation={activeSituation}
              onToggleSituation={toggleSituationFromBar}
            />
          </div>

          <div className="sticky top-0 z-10 shrink-0 border-b border-border/70 bg-background px-3 pb-0 pt-1 shadow-[0_1px_0_0_hsl(var(--border))] sm:px-6">
            <div className="mb-2 flex items-center gap-2">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative h-9 shrink-0 gap-1.5 px-2.5 md:hidden"
                  >
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
                      <p className="text-xs font-medium text-muted-foreground">Pipeline</p>
                      <CeStatusTabs
                        variant="chips"
                        active={statutTab}
                        counts={statusCounts}
                        onChange={setStatutTab}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Situation juridique
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {CE_SITUATIONS.map((s) => {
                          const selected = situationFilter.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() =>
                                setSituationFilter((prev) =>
                                  selected ? prev.filter((x) => x !== s) : [...prev, s],
                                )
                              }
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : cn("border-border bg-background", CE_SITUATION_STYLES[s].badge),
                              )}
                            >
                              {CE_SITUATION_LABELS[s]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => setFiltersOpen(false)}>
                      Appliquer
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="mb-2 hidden flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2 md:flex">
              <div className="relative w-full sm:w-[280px] lg:w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher référence, raison sociale…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="h-9 bg-background pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CE_SITUATIONS.map((s) => {
                  const selected = situationFilter.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setSituationFilter((prev) =>
                          selected ? prev.filter((x) => x !== s) : [...prev, s],
                        )
                      }
                      className={cn(
                        "inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs font-medium",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : cn("border-border bg-background", CE_SITUATION_STYLES[s].badge),
                      )}
                    >
                      {CE_SITUATION_LABELS[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden md:block">
              <CeStatusTabs active={statutTab} counts={statusCounts} onChange={setStatutTab} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2 sm:px-6">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucun dossier CE.</p>
                <Button type="button" size="sm" onClick={() => setWizardOpen(true)}>
                  Créer un dossier
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {mobileGroups.map((group) => (
                  <section key={group.statut} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("h-2 w-2 rounded-full", CE_STATUT_STYLES[group.statut].dot)}
                      />
                      <h3 className="text-xs font-semibold text-muted-foreground">
                        {CE_STATUT_LABELS[group.statut]}
                      </h3>
                      <span className="rounded-full bg-muted px-1.5 text-xs font-semibold tabular-nums text-foreground/70">
                        {group.items.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((d) => (
                        <CeCard key={d.id} dossier={d} onSelect={openDetail} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppShell>

      <CeCreateWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <CeDetailSheet
        dossierId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />
    </>
  );
}

function KpiTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "blue" | "amber" | "emerald";
}) {
  const valueClass =
    accent === "blue"
      ? "text-blue-600 dark:text-blue-400"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="rounded-lg border border-border/60 bg-card px-2.5 py-2 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 truncate text-sm font-semibold tabular-nums", valueClass)}>
        {value}
      </p>
    </div>
  );
}
