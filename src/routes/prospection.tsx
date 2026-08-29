import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Panel, StatusBadge } from "@/components/commerce/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProspection } from "@/hooks/useCommerceData";
import type { ProspectionStatut } from "@/lib/commerceTypes";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const STATUT_LABELS: Record<ProspectionStatut, string> = {
  a_contacter: "À contacter",
  en_cours: "En cours",
  relance: "Relance",
  gagne: "Gagné",
  perdu: "Perdu",
  inactif: "Inactif",
};

export const Route = createFileRoute("/prospection")({
  component: ProspectionPage,
});

function ProspectionPage() {
  const { data: rows = [] } = useProspection();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({
    commune_key: "",
    departement: "",
    qui_cible: "",
    statut: "a_contacter" as ProspectionStatut,
    notes: "",
  });

  const filtered = rows.filter((r) => {
    const q = filter.toLowerCase();
    return !q || r.commune_key.toLowerCase().includes(q) || r.qui_cible.toLowerCase().includes(q);
  });

  async function addCommune() {
    if (!form.commune_key.trim()) return;
    await supabase.from("prospection_suivi").upsert({
      commune_key: form.commune_key.trim(),
      departement: form.departement || null,
      qui_cible: form.qui_cible,
      statut: form.statut,
      notes: form.notes,
    });
    setForm({
      commune_key: "",
      departement: "",
      qui_cible: "",
      statut: "a_contacter",
      notes: "",
    });
    await qc.invalidateQueries();
  }

  return (
    <AppShell title="Prospection" subtitle="Suivi communes IDF (module migré)">
      <Input
        placeholder="Filtrer commune ou cible…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />

      <Panel title="Nouvelle commune" className="mt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Commune (clé)"
            value={form.commune_key}
            onChange={(e) => setForm((f) => ({ ...f, commune_key: e.target.value }))}
          />
          <Input
            placeholder="Département"
            value={form.departement}
            onChange={(e) => setForm((f) => ({ ...f, departement: e.target.value }))}
          />
          <Input
            placeholder="Qui cible"
            value={form.qui_cible}
            onChange={(e) => setForm((f) => ({ ...f, qui_cible: e.target.value }))}
          />
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={form.statut}
            onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value as ProspectionStatut }))}
          >
            {Object.entries(STATUT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Textarea
            className="sm:col-span-2"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <Button className="mt-3" size="sm" onClick={addCommune}>
          Enregistrer
        </Button>
      </Panel>

      <Panel title="Communes suivies" className="mt-4" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commune</TableHead>
              <TableHead>Dép.</TableHead>
              <TableHead>Cible</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.commune_key}</TableCell>
                <TableCell>{r.departement ?? "—"}</TableCell>
                <TableCell>{r.qui_cible || "—"}</TableCell>
                <TableCell>
                  <StatusBadge statut={r.statut} labels={STATUT_LABELS} />
                </TableCell>
                <TableCell className="max-w-xs truncate">{r.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </AppShell>
  );
}
