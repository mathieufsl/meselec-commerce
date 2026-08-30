import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel, StatusBadge } from "@/components/commerce/AppShell";
import { CommerceAoCard } from "@/components/commerce/CommerceAoCard";
import { CommerceAoDateFilters } from "@/components/commerce/CommerceAoDateFilters";
import { CommerceAoKanban } from "@/components/commerce/CommerceAoKanban";
import { CommerceKpiBar, type CommerceKpiKey } from "@/components/commerce/CommerceKpiBar";
import { CommerceStatusTabs, type AoStatutTab } from "@/components/commerce/CommerceStatusTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAppelsOffres,
  useAoDocumentCounts,
  useClients,
  useCommerceSettings,
  useSocietes,
  useUpsertAppelOffre,
} from "@/hooks/useCommerceData";
import { matchesAoSocieteFilter, useAoSocieteFilter } from "@/hooks/useAoSocieteFilter";
import { AO_STATUT_LABELS, AO_STATUTS, type AoStatut } from "@/lib/commerceTypes";
import { AO_STATUT_STYLES } from "@/lib/aoStatusStyles";
import { matchesAoDateFilter, type AoDateFilterPreset } from "@/lib/aoFilters";
import { daysUntil, formatEuro } from "@/lib/bpuEngine";
import { cn } from "@/lib/utils";
import { AlertTriangle, Columns3, LayoutList, Paperclip, Search } from "lucide-react";

type AoViewMode = "liste" | "kanban";

export const Route = createFileRoute("/appels-offres/")({
  component: AppelsOffresPage,
});

function AppelsOffresPage() {
  const navigate = useNavigate();
  const { data: aos = [], isLoading } = useAppelsOffres();
  const { data: docCounts = {} } = useAoDocumentCounts();
  const { data: clients = [] } = useClients();
  const { data: societes = [] } = useSocietes();
  const { selectedSocieteId, setSelectedSocieteId } = useAoSocieteFilter();
  const { data: settings } = useCommerceSettings();
  const upsert = useUpsertAppelOffre();
  const [filter, setFilter] = useState("");
  const [statutTab, setStatutTab] = useState<AoStatutTab>("all");
  const [kpiFilter, setKpiFilter] = useState<CommerceKpiKey | null>(null);
  const [viewMode, setViewMode] = useState<AoViewMode>("liste");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState<AoDateFilterPreset | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    reference: "",
    titre: "",
    donneur_ordre_id: "",
    date_limite_depot: "",
    montant_estime: "",
    societe_attribuee_id: societes[0]?.id ?? "",
  });

  const defaultSocieteId =
    selectedSocieteId !== "all" ? selectedSocieteId : (societes[0]?.id ?? "");

  const scopedAos = useMemo(
    () => aos.filter((ao) => matchesAoSocieteFilter(ao.societe_attribuee_id, selectedSocieteId)),
    [aos, selectedSocieteId],
  );

  const actifs = scopedAos.filter((a) => !["gagne", "perdu", "abandonne"].includes(a.statut));
  const urgents = actifs.filter((a) => {
    const d = daysUntil(a.date_limite_depot);
    return d != null && d >= 0 && d <= 14;
  });
  const montantPipeline = actifs.reduce((s, a) => s + (a.montant_estime ?? 0), 0);
  const gagnes = scopedAos.filter((a) => a.statut === "gagne");
  const montantGagne = gagnes.reduce((s, a) => s + (a.montant_estime ?? 0), 0);

  const statusCounts = useMemo(() => {
    const counts: Record<AoStatutTab, number> = {
      all: scopedAos.length,
      veille: 0,
      analyse: 0,
      en_cours: 0,
      depose: 0,
      gagne: 0,
      perdu: 0,
      abandonne: 0,
    };
    for (const ao of scopedAos) counts[ao.statut as AoStatut]++;
    return counts;
  }, [scopedAos]);

  const filtered = scopedAos.filter((ao) => {
    const q = filter.toLowerCase();
    const matchSearch =
      !q ||
      ao.reference.toLowerCase().includes(q) ||
      ao.titre.toLowerCase().includes(q) ||
      (ao.clients?.nom_entreprise ?? "").toLowerCase().includes(q);
    const matchTab = viewMode === "kanban" || statutTab === "all" || ao.statut === statutTab;
    const matchKpi =
      !kpiFilter ||
      (kpiFilter === "pipeline" && !["gagne", "perdu", "abandonne"].includes(ao.statut)) ||
      (kpiFilter === "montant" && !["gagne", "perdu", "abandonne"].includes(ao.statut)) ||
      (kpiFilter === "gagnes" && ao.statut === "gagne");
    const matchDate = matchesAoDateFilter(ao.date_limite_depot, dateFrom, dateTo, datePreset);
    return matchSearch && matchTab && matchKpi && matchDate;
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
    await upsert.mutateAsync({ id: aoId, statut });
  }

  async function createAo() {
    await upsert.mutateAsync({
      reference: form.reference.trim(),
      titre: form.titre.trim(),
      donneur_ordre_id: form.donneur_ordre_id || null,
      date_limite_depot: form.date_limite_depot || null,
      montant_estime: form.montant_estime ? Number(form.montant_estime) : null,
      societe_attribuee_id: form.societe_attribuee_id || null,
      statut: "veille",
    });
    setShowForm(false);
    setForm({
      reference: "",
      titre: "",
      donneur_ordre_id: "",
      date_limite_depot: "",
      montant_estime: "",
      societe_attribuee_id: defaultSocieteId,
    });
  }

  async function openCreateForm() {
    setForm((f) => ({
      ...f,
      societe_attribuee_id: defaultSocieteId,
    }));
    setShowForm(true);
  }

  const enCours = scopedAos.filter((a) => ["analyse", "en_cours"].includes(a.statut));

  const headerBanner =
    urgents.length > 0 || enCours.length > 0 ? (
      <>
        {urgents.length > 0 ? (
          <div className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-info/25 bg-info/5 px-2.5 text-xs text-info">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-info" />
            <span>
              <span className="font-semibold">{urgents.length}</span> échéance(s) · 14 j
            </span>
          </div>
        ) : null}
        {enCours.length > 0 ? (
          <div className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-warning/25 bg-warning/5 px-2.5 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
            <span>
              <span className="font-semibold">{enCours.length}</span> en analyse ou chiffrage
            </span>
          </div>
        ) : null}
      </>
    ) : null;

  return (
    <AppShell
      title="Appels d'offres"
      flush
      banner={headerBanner}
      {...(showForm
        ? {}
        : { primaryAction: { label: "Créer un AO", onClick: openCreateForm } })}

      actions={
        showForm ? (
          <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
            Annuler
          </Button>
        ) : null
      }
      contentClassName="flex min-h-0 flex-col overflow-hidden"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 px-4 pb-1.5 pt-1.5 sm:px-6">
          <CommerceKpiBar
          pipelineCount={actifs.length}
          montantPipeline={montantPipeline}
          gagnesCount={gagnes.length}
          montantGagne={montantGagne}
          active={kpiFilter}
          onToggle={(k) => setKpiFilter((prev) => (prev === k ? null : k))}
          />
        </div>

        <div className="sticky top-0 z-10 shrink-0 border-b border-border/70 bg-background px-4 pb-2 pt-1 shadow-[0_1px_0_0_hsl(var(--border))] sm:px-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher référence, titre, client…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
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
          </div>
          <div className="mb-2">
            <CommerceAoDateFilters
              dateFrom={dateFrom}
              dateTo={dateTo}
              preset={datePreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onPresetChange={setDatePreset}
              onClear={() => {
                setDateFrom("");
                setDateTo("");
                setDatePreset(null);
              }}
            />
          </div>
          {viewMode === "liste" ? (
            <CommerceStatusTabs active={statutTab} counts={statusCounts} onChange={setStatutTab} />
          ) : null}
        </div>

        {showForm ? (
          <Panel title="Créer un appel d'offres" className="mx-4 mt-2 sm:mx-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Référence</span>
                <Input
                  value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Titre</span>
                <Input
                  value={form.titre}
                  onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Donneur d&apos;ordre</span>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.donneur_ordre_id}
                  onChange={(e) => setForm((f) => ({ ...f, donneur_ordre_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom_entreprise}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Date limite dépôt</span>
                <Input
                  type="date"
                  value={form.date_limite_depot}
                  onChange={(e) => setForm((f) => ({ ...f, date_limite_depot: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Montant estimé (€)</span>
                <Input
                  type="number"
                  value={form.montant_estime}
                  onChange={(e) => setForm((f) => ({ ...f, montant_estime: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Société d&apos;exploitation</span>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.societe_attribuee_id}
                  onChange={(e) => setForm((f) => ({ ...f, societe_attribuee_id: e.target.value }))}
                >
                  {societes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button className="mt-4" onClick={createAo} disabled={!form.reference || !form.titre}>
              Enregistrer
            </Button>
          </Panel>
        ) : null}

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
              />
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Mobile : cartes groupées par statut */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-2 md:hidden">
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
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {AO_STATUT_LABELS[group.statut]}
                      </h3>
                      <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-foreground/70">
                        {group.items.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((ao) => (
                        <CommerceAoCard
                          key={ao.id}
                          ao={ao}
                          statut={group.statut}
                          docCount={docCounts[ao.id]}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>

            <Panel
              title={`${filtered.length} appel(s) d'offres`}
              bodyClassName="min-h-0 flex-1 overflow-y-auto p-0"
              className="mx-4 mt-2 hidden min-h-0 flex-1 flex-col sm:mx-6 md:flex"
            >
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Client</TableHead>
                  <TableHead>Société</TableHead>
                  <TableHead>Réf.</TableHead>
                  <TableHead>Lieu / Objet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Docs</TableHead>
                  <TableHead>Date limite</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ao) => {
                  const days = daysUntil(ao.date_limite_depot);
                  return (
                    <TableRow
                      key={ao.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => navigate({ to: "/appels-offres/$aoId", params: { aoId: ao.id } })}
                    >
                      <TableCell className="font-medium">
                        {ao.clients?.nom_entreprise ?? "—"}
                      </TableCell>
                      <TableCell>
                        {ao.societes_exploitation?.code ? (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground/80">
                            {ao.societes_exploitation.code}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          to="/appels-offres/$aoId"
                          params={{ aoId: ao.id }}
                          className="font-semibold text-primary hover:underline"
                        >
                          {ao.reference}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="truncate font-medium">{ao.titre}</p>
                        {ao.lieu ? (
                          <p className="truncate text-xs text-muted-foreground">{ao.lieu}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <StatusBadge statut={ao.statut} labels={AO_STATUT_LABELS} />
                      </TableCell>
                      <TableCell className="text-center">
                        {docCounts[ao.id] ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="h-3.5 w-3.5" />
                            {docCounts[ao.id]}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          days != null && days <= 7 && ao.statut !== "gagne" && "font-medium text-[var(--color-accent)]",
                        )}
                      >
                        {ao.date_limite_depot
                          ? new Date(ao.date_limite_depot).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatEuro(ao.montant_estime)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
            </Panel>
          </div>
        )}

        <div className="flex shrink-0 items-center justify-between border-t px-4 py-1.5 text-[11px] text-muted-foreground sm:px-6">
          <span>
            {filtered.length} élément(s)
            {viewMode === "kanban" ? " · glisser-déposer pour changer le statut" : ""}
            {syncLabel ? ` · Sync ERP ${syncLabel}` : ""}
          </span>
        </div>
      </div>
    </AppShell>
  );
}
