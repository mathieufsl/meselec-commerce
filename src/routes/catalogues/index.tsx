import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Pencil, Search } from "lucide-react";
import { AppShell, Panel } from "@/components/commerce/AppShell";
import { BpuExcelImportPanel } from "@/components/commerce/BpuExcelImportPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const navigate = useNavigate();
  const { data: catalogues = [] } = useBpuCatalogues();
  const importBpu = useImportBpuLignes();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    type: "bpu" as "bpu" | "dpgf",
    secteur: "EP" as "EP" | "Tertiaire" | "Enedis",
  });
  const [importText, setImportText] = useState("");
  const [importCatalogueId, setImportCatalogueId] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalogues;
    return catalogues.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        (c.secteur ?? "").toLowerCase().includes(q) ||
        (c.source_fichier ?? "").toLowerCase().includes(q),
    );
  }, [catalogues, search]);

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
    await qc.invalidateQueries();
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
    <AppShell
      title="Catalogues BPU / DPGF"
      actions={
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Gestion des catalogues</SheetTitle>
              <SheetDescription>
                Création et imports — réservé aux mises à jour ponctuelles.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <Panel title="Nouveau catalogue">
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Nom du catalogue"
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    className="min-w-[200px] flex-1"
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
                      setForm((f) => ({
                        ...f,
                        secteur: e.target.value as "EP" | "Tertiaire" | "Enedis",
                      }))
                    }
                  >
                    <option value="EP">EP</option>
                    <option value="Tertiaire">Tertiaire</option>
                    <option value="Enedis">Enedis</option>
                  </select>
                  <Button size="sm" onClick={() => void createCatalogue()}>
                    Créer
                  </Button>
                </div>
              </Panel>

              <Panel title="Import Excel">
                <select
                  className="mb-3 h-9 w-full rounded-md border px-2 text-sm"
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
                <BpuExcelImportPanel
                  disabled={!importCatalogueId}
                  onImport={async (result) => {
                    if (!importCatalogueId) return;
                    await importExcelToCatalogue(
                      importCatalogueId,
                      catalogueRowsOnly(result.catalogueRows),
                      result.meta.fileName ?? "import.xlsx",
                    );
                  }}
                />
              </Panel>

              <Panel title="Import CSV / TSV">
                <select
                  className="mb-2 h-9 w-full rounded-md border px-2 text-sm"
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
                <Textarea
                  rows={6}
                  placeholder="numero_prix;designation;unite;pu_ht"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={() => void runTextImport()}
                  disabled={importBpu.isPending}
                >
                  Importer
                </Button>
              </Panel>
            </div>
          </SheetContent>
        </Sheet>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un catalogue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Panel title={`${filtered.length} catalogue(s)`} bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Secteur</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() =>
                  navigate({ to: "/catalogues/$catalogueId", params: { catalogueId: c.id } })
                }
              >
                <TableCell className="font-semibold">{c.nom}</TableCell>
                <TableCell className="uppercase">{c.type}</TableCell>
                <TableCell>{c.secteur ?? "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                  {c.source_fichier ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </AppShell>
  );
}
