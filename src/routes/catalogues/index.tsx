import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useBpuCatalogues, useImportBpuLignes } from "@/hooks/useCommerceData";
import { supabase } from "@/integrations/supabase/client";
import { parseBpuTextImport } from "@/lib/bpuEngine";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/catalogues/")({
  component: CataloguesPage,
});

function CataloguesPage() {
  const { data: catalogues = [] } = useBpuCatalogues();
  const importBpu = useImportBpuLignes();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nom: "", type: "bpu" as "bpu" | "dpgf" });
  const [importText, setImportText] = useState("");
  const [importCatalogueId, setImportCatalogueId] = useState("");

  async function createCatalogue() {
    if (!form.nom.trim()) return;
    await supabase.from("bpu_catalogues").insert({
      nom: form.nom.trim(),
      type: form.type,
      actif: true,
    });
    setForm({ nom: "", type: "bpu" });
    await qc.invalidateQueries();
  }

  async function runImport() {
    if (!importCatalogueId || !importText.trim()) return;
    const rows = parseBpuTextImport(importText);
    await importBpu.mutateAsync({ catalogueId: importCatalogueId, lignes: rows });
    setImportText("");
  }

  return (
    <AppShell title="Catalogues BPU / DPGF" subtitle={`${catalogues.length} catalogue(s)`}>
      <Panel title="Nouveau catalogue">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Nom du catalogue"
            value={form.nom}
            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            className="max-w-sm"
          />
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "bpu" | "dpgf" }))}
          >
            <option value="bpu">BPU</option>
            <option value="dpgf">DPGF</option>
          </select>
          <Button size="sm" onClick={createCatalogue}>
            Créer
          </Button>
        </div>
      </Panel>

      <Panel title="Import rapide (CSV / TSV)" className="mt-4">
        <div className="mb-2 flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={importCatalogueId}
            onChange={(e) => setImportCatalogueId(e.target.value)}
          >
            <option value="">Catalogue cible</option>
            {catalogues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={runImport} disabled={importBpu.isPending}>
            Importer
          </Button>
        </div>
        <Textarea
          rows={6}
          placeholder="numero_prix;designation;unite;pu_ht"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
      </Panel>

      <Panel title="Catalogues" className="mt-4" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalogues.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-semibold">{c.nom}</TableCell>
                <TableCell className="uppercase">{c.type}</TableCell>
                <TableCell>{c.actif ? "Oui" : "Non"}</TableCell>
                <TableCell className="text-right">
                  <Link to="/catalogues/$catalogueId" params={{ catalogueId: c.id }}>
                    <Button size="sm" variant="outline">
                      Ouvrir
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </AppShell>
  );
}
