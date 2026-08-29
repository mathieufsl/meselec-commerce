import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel, StatusBadge } from "@/components/commerce/AppShell";
import { CommerceKpiBar, type CommerceKpiKey } from "@/components/commerce/CommerceKpiBar";
import { CommerceStatusTabs, type AoStatutTab } from "@/components/commerce/CommerceStatusTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  useClients,
  useCommerceSettings,
  useSocietes,
  useUpsertAppelOffre,
} from "@/hooks/useCommerceData";
import { AO_STATUT_LABELS, AO_STATUTS, type AoStatut } from "@/lib/commerceTypes";
import { AO_STATUT_STYLES } from "@/lib/aoStatusStyles";
import { daysUntil, formatEuro } from "@/lib/bpuEngine";
import { cn } from "@/lib/utils";
import { AlertTriangle, Search } from "lucide-react";

export const Route = createFileRoute("/appels-offres/")({
  component: AppelsOffresPage,
});

function AppelsOffresPage() {
  const navigate = useNavigate();
  const { data: aos = [], isLoading } = useAppelsOffres();
  const { data: clients = [] } = useClients();
  const { data: societes = [] } = useSocietes();
  const { data: settings } = useCommerceSettings();
  const upsert = useUpsertAppelOffre();
  const [filter, setFilter] = useState("");
  const [statutTab, setStatutTab] = useState<AoStatutTab>("all");
  const [kpiFilter, setKpiFilter] = useState<CommerceKpiKey | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    reference: "",
    titre: "",
    donneur_ordre_id: "",
    date_limite_depot: "",
    montant_estime: "",
    societe_attribuee_id: societes[0]?.id ?? "",
  });

  const actifs = aos.filter((a) => !["gagne", "perdu", "abandonne"].includes(a.statut));
  const urgents = actifs.filter((a) => {
    const d = daysUntil(a.date_limite_depot);
    return d != null && d >= 0 && d <= 14;
  });
  const montantPipeline = actifs.reduce((s, a) => s + (a.montant_estime ?? 0), 0);
  const gagnes = aos.filter((a) => a.statut === "gagne");
  const montantGagne = gagnes.reduce((s, a) => s + (a.montant_estime ?? 0), 0);

  const statusCounts = useMemo(() => {
    const counts: Record<AoStatutTab, number> = {
      all: aos.length,
      veille: 0,
      analyse: 0,
      en_cours: 0,
      depose: 0,
      gagne: 0,
      perdu: 0,
      abandonne: 0,
    };
    for (const ao of aos) counts[ao.statut as AoStatut]++;
    return counts;
  }, [aos]);

  const filtered = aos.filter((ao) => {
    const q = filter.toLowerCase();
    const matchSearch =
      !q ||
      ao.reference.toLowerCase().includes(q) ||
      ao.titre.toLowerCase().includes(q) ||
      (ao.clients?.nom_entreprise ?? "").toLowerCase().includes(q);
    const matchTab = statutTab === "all" || ao.statut === statutTab;
    const matchKpi =
      !kpiFilter ||
      (kpiFilter === "pipeline" && !["gagne", "perdu", "abandonne"].includes(ao.statut)) ||
      (kpiFilter === "montant" && !["gagne", "perdu", "abandonne"].includes(ao.statut)) ||
      (kpiFilter === "gagnes" && ao.statut === "gagne");
    return matchSearch && matchTab && matchKpi;
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
      societe_attribuee_id: societes[0]?.id ?? "",
    });
  }

  const enCours = aos.filter((a) => ["analyse", "en_cours"].includes(a.statut));

  return (
    <AppShell
      title="Appels d'offres"
      subtitle={`${aos.length} marché(s)`}
      syncLabel={syncLabel}
      flush
      {...(showForm
        ? {}
        : { primaryAction: { label: "Créer un AO", onClick: () => setShowForm(true) } })}

      actions={
        showForm ? (
          <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
            Annuler
          </Button>
        ) : null
      }
      contentClassName="flex min-h-0 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col space-y-0">
        <div className="shrink-0 space-y-2 px-4 pb-2 pt-2 sm:px-6">
          {urgents.length > 0 ? (
            <Alert className="border-sky-500/30 bg-sky-500/5">
              <AlertTriangle className="h-4 w-4 text-sky-600" />
              <AlertTitle>Échéances proches</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {urgents.length} appel(s) d&apos;offres avec dépôt dans les 14 prochains jours.
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/appels-offres">Ouvrir la liste</Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {enCours.length > 0 ? (
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle>Réponses en cours</AlertTitle>
              <AlertDescription>
                {enCours.length} AO en analyse ou en cours de chiffrage.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="shrink-0 px-4 sm:px-6">
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
          </div>
          <CommerceStatusTabs active={statutTab} counts={statusCounts} onChange={setStatutTab} />
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

        {/* Mobile : cartes groupées par statut */}
        <div className="min-h-0 flex-1 space-y-4 px-4 pb-4 pt-2 md:hidden">
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
                  <span className="ml-auto text-[11px] font-medium tabular-nums text-muted-foreground">
                    {formatEuro(group.items.reduce((s, a) => s + (a.montant_estime ?? 0), 0))}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map((ao) => {
                    const days = daysUntil(ao.date_limite_depot);
                    const urgent = days != null && days >= 0 && days <= 7;
                    return (
                      <Link
                        key={ao.id}
                        to="/appels-offres/$aoId"
                        params={{ aoId: ao.id }}
                        className="relative block overflow-hidden rounded-xl border border-border/70 bg-card p-3 pl-4 shadow-sm active:bg-muted/40"
                      >
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 w-1",
                            AO_STATUT_STYLES[group.statut].bar,
                          )}
                        />
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold leading-tight">
                              {ao.clients?.nom_entreprise ?? ao.reference}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{ao.titre}</p>
                          </div>
                          <span className="shrink-0 text-sm font-bold tabular-nums">
                            {formatEuro(ao.montant_estime)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground/70">{ao.reference}</span>
                          {ao.lieu ? <span className="truncate">{ao.lieu}</span> : null}
                          {ao.date_limite_depot ? (
                            <span
                              className={cn(
                                "ml-auto font-medium tabular-nums",
                                urgent && "text-amber-600",
                              )}
                            >
                              {new Date(ao.date_limite_depot).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                              })}
                              {days != null && days >= 0 ? ` · J-${days}` : ""}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <Panel
          title={`${filtered.length} appel(s) d'offres`}
          bodyClassName="p-0"
          className="mx-4 mt-2 hidden min-h-0 flex-1 sm:mx-6 md:block"
        >
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Client</TableHead>
                  <TableHead>Réf.</TableHead>
                  <TableHead>Lieu / Objet</TableHead>
                  <TableHead>Statut</TableHead>
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
                      <TableCell
                        className={cn(
                          days != null && days <= 7 && ao.statut !== "gagne" && "text-amber-600 font-medium",
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

        <div className="flex shrink-0 items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground sm:px-6">
          <span>
            {filtered.length} élément(s) affiché(s)
            {syncLabel ? ` · Sync ERP ${syncLabel}` : ""}
          </span>
        </div>
      </div>
    </AppShell>
  );
}
