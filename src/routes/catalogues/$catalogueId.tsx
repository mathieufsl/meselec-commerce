import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/commerce/AppShell";
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
import { useBpuCatalogues, useBpuLignes } from "@/hooks/useCommerceData";
import { formatEuro, isBpuLigneSelectable } from "@/lib/bpuEngine";

export const Route = createFileRoute("/catalogues/$catalogueId")({
  component: CatalogueDetailPage,
});

function CatalogueDetailPage() {
  const { catalogueId } = Route.useParams();
  const { data: catalogues = [] } = useBpuCatalogues();
  const { data: lignes = [] } = useBpuLignes(catalogueId);
  const [q, setQ] = useState("");

  const catalogue = catalogues.find((c) => c.id === catalogueId);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return lignes.filter(
      (l) =>
        !needle ||
        l.designation.toLowerCase().includes(needle) ||
        l.numero_prix.toLowerCase().includes(needle),
    );
  }, [lignes, q]);

  const selectable = filtered.filter(isBpuLigneSelectable);

  return (
    <AppShell
      title={catalogue?.nom ?? "Catalogue"}
      subtitle={`${lignes.length} lignes · ${catalogue?.type.toUpperCase() ?? ""}`}
      actions={
        <Link to="/catalogues">
          <Button variant="outline" size="sm">
            Retour
          </Button>
        </Link>
      }
    >
      <Input
        placeholder="Rechercher une ligne…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />

      <Panel title="Lignes tarifaires" className="mt-4" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° prix</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead className="text-right">PU HT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id} className={!isBpuLigneSelectable(l) ? "opacity-60" : ""}>
                <TableCell>{l.numero_prix}</TableCell>
                <TableCell>{l.designation}</TableCell>
                <TableCell>{l.unite ?? "—"}</TableCell>
                <TableCell>{l.niveau}</TableCell>
                <TableCell className="text-right">{formatEuro(l.pu_ht)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t px-4 py-2 text-xs text-[var(--commerce-muted)]">
          {selectable.length} ligne(s) sélectionnables pour chiffrage
        </p>
      </Panel>
    </AppShell>
  );
}
