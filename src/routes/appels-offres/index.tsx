import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel, StatusBadge } from "@/components/commerce/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useSocietes,
  useUpsertAppelOffre,
} from "@/hooks/useCommerceData";
import { AO_STATUT_LABELS, AO_STATUTS } from "@/lib/commerceTypes";
import { daysUntil, formatEuro } from "@/lib/bpuEngine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/appels-offres/")({
  component: AppelsOffresPage,
});

function AppelsOffresPage() {
  const { data: aos = [], isLoading } = useAppelsOffres();
  const { data: clients = [] } = useClients();
  const { data: societes = [] } = useSocietes();
  const upsert = useUpsertAppelOffre();
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    reference: "",
    titre: "",
    donneur_ordre_id: "",
    date_limite_depot: "",
    montant_estime: "",
    societe_attribuee_id: societes[0]?.id ?? "",
  });

  const filtered = aos.filter((ao) => {
    const q = filter.toLowerCase();
    return (
      !q ||
      ao.reference.toLowerCase().includes(q) ||
      ao.titre.toLowerCase().includes(q) ||
      (ao.clients?.nom_entreprise ?? "").toLowerCase().includes(q)
    );
  });

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

  return (
    <AppShell
      title="Appels d'offres"
      subtitle={`${aos.length} marché(s)`}
      actions={
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Annuler" : "Nouvel AO"}
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Rechercher référence, titre, client…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {showForm ? (
        <Panel title="Créer un appel d'offres" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[var(--commerce-muted)]">Référence</span>
              <Input
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[var(--commerce-muted)]">Titre</span>
              <Input
                value={form.titre}
                onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[var(--commerce-muted)]">Donneur d'ordre</span>
              <select
                className="h-9 w-full rounded-md border px-2 text-sm"
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
              <span className="text-[var(--commerce-muted)]">Date limite dépôt</span>
              <Input
                type="date"
                value={form.date_limite_depot}
                onChange={(e) => setForm((f) => ({ ...f, date_limite_depot: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[var(--commerce-muted)]">Montant estimé (€)</span>
              <Input
                type="number"
                value={form.montant_estime}
                onChange={(e) => setForm((f) => ({ ...f, montant_estime: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[var(--commerce-muted)]">Société d'exploitation</span>
              <select
                className="h-9 w-full rounded-md border px-2 text-sm"
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

      <Panel title="Liste" className="mt-4" bodyClassName="p-0">
        {isLoading ? (
          <p className="p-4 text-sm text-[var(--commerce-muted)]">Chargement…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ao) => {
                const days = daysUntil(ao.date_limite_depot);
                return (
                  <TableRow key={ao.id}>
                    <TableCell>
                      <Link
                        to="/appels-offres/$aoId"
                        params={{ aoId: ao.id }}
                        className="font-semibold text-[var(--commerce-ink)] hover:underline"
                      >
                        {ao.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">{ao.titre}</TableCell>
                    <TableCell>{ao.clients?.nom_entreprise ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge statut={ao.statut} labels={AO_STATUT_LABELS} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        days != null && days <= 7 && ao.statut !== "gagne" && "text-[var(--commerce-warn)]",
                      )}
                    >
                      {ao.date_limite_depot
                        ? new Date(ao.date_limite_depot).toLocaleDateString("fr-FR")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">{formatEuro(ao.montant_estime)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </AppShell>
  );
}
