import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/commerce/AppShell";
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
import { useFournisseurs } from "@/hooks/useCommerceData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/fournisseurs")({
  component: FournisseursPage,
});

function FournisseursPage() {
  const { data: fournisseurs = [] } = useFournisseurs();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nom: "",
    specialites: "",
    siret: "",
    notes: "",
  });

  async function addFournisseur() {
    if (!form.nom.trim()) return;
    await supabase.from("fournisseurs_commerciaux").insert({
      nom: form.nom.trim(),
      specialites: form.specialites
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      siret: form.siret || null,
      notes: form.notes || null,
      actif: true,
    });
    setForm({ nom: "", specialites: "", siret: "", notes: "" });
    await qc.invalidateQueries();
  }

  return (
    <AppShell title="Fournisseurs commerciaux" subtitle={`${fournisseurs.length} référencé(s)`}>
      <Panel title="Ajouter un fournisseur">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Nom"
            value={form.nom}
            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
          />
          <Input
            placeholder="Spécialités (séparées par des virgules)"
            value={form.specialites}
            onChange={(e) => setForm((f) => ({ ...f, specialites: e.target.value }))}
          />
          <Input
            placeholder="SIRET"
            value={form.siret}
            onChange={(e) => setForm((f) => ({ ...f, siret: e.target.value }))}
          />
          <Textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <Button className="mt-3" size="sm" onClick={addFournisseur}>
          Enregistrer
        </Button>
      </Panel>

      <Panel title="Répertoire" className="mt-4" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Spécialités</TableHead>
              <TableHead>SIRET</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fournisseurs.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-semibold">{f.nom}</TableCell>
                <TableCell>{f.specialites.join(", ") || "—"}</TableCell>
                <TableCell>{f.siret ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{f.notes ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </AppShell>
  );
}
