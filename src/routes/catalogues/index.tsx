import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/commerce/AppShell";
import { BpuExcelImportPanel } from "@/components/commerce/BpuExcelImportPanel";
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
import { catalogueRowsOnly } from "@/lib/bpuExcelImport";
import { parseBpuTextImport } from "@/lib/bpuEngine";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/catalogues/")({
  component: CataloguesPage,
});

function CataloguesPage() {
  const { data: catalogues = [] } = useBpuCatalogues();
  const importBpu = useImportBpuLignes();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nom: "",
    type: "bpu" as "bpu" | "dpgf",
    secteur: "EP" as "EP" | "Tertiaire" | "Enedis",
  });
  const [importText, setImportText] = useState("");
  const [importCatalogueId, setImportCatalogueId] = useState("");

  async function createCatalogue() {
    if (!form.nom.trim()) return;
    await supabase.from("bpu_catalogues").insert({
      nom: form.nom.trim(),
      type: form.type,
      secteur: form.secteur,
      actif: true,
    });
    setForm({ nom: "", type: "bpu", secteur: "EP" });
    await qc.invalidateQueries();
  }

  async function runTextImport() {
    if (!importCatalogueId || !importText.trim()) return;
    const rows = parseBpuTextImport(importText);
    await importBpu.mutateAsync({ catalogueId: importCatalogueId, lignes: rows });
    setImportText("");
  }

  async function importExcelToCatalogue(
    catalogueId: string,
    rows: ReturnType<typeof catalogueRowsOnly>,
    sourceFichier: string,
  ) {
    await importBpu.mutateAsync({ catalogueId, lignes: rows });
    await supabase
      .from("bpu_catalogues")
      .update({ source_fichier: sourceFichier })
      .eq("id", catalogueId);
    await qc.invalidateQueries();
  }

  return (
    <AppShell title="Catalogues BPU / DPGF" subtitle={`${catalogues.length} catalogue(s) — Éclairage public`}>
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
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={form.secteur}
            onChange={(e) =>
              setForm((f) => ({ ...f, secteur: e.target.value as "EP" | "Tertiaire" | "Enedis" }))
            }
          >
            <option value="EP">EP</option>
            <option value="Tertiaire">Tertiaire</option>
            <option value="Enedis">Enedis</option>
          </select>
          <Button size="sm" onClick={createCatalogue}>
            Créer
          </Button>
        </div>
      </Panel>

      <Panel title="Import Excel BPU / DPGF" className="mt-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={importCatalogueId}
            onChange={(e) => setImportCatalogueId(e.target.value)}
          >
            <option value="">Catalogue cible (ou créer d&apos;abord)</option>
            {catalogues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom} {c.secteur ? `(${c.secteur})` : ""}
              </option>
            ))}
          </select>
        </div>
        <BpuExcelImportPanel
          disabled={!importCatalogueId}
          onImport={async (result) => {
            if (!importCatalogueId) return;
            const rows = catalogueRowsOnly(result.catalogueRows);
            await importExcelToCatalogue(
              importCatalogueId,
              rows,
              result.meta.fileName ?? "import.xlsx",
            );
          }}
        />
        {!importCatalogueId ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Sélectionnez un catalogue cible avant d&apos;importer.
          </p>
        ) : null}
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
          <Button size="sm" onClick={runTextImport} disabled={importBpu.isPending}>
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
              <TableHead>Secteur</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalogues.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-semibold">{c.nom}</TableCell>
                <TableCell className="uppercase">{c.type}</TableCell>
                <TableCell>{c.secteur ?? "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                  {c.source_fichier ?? "—"}
                </TableCell>
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
