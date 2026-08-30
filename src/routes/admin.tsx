import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/commerce/AppShell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCommerceSettings, useSocietes } from "@/hooks/useCommerceData";
import { syncErpCache } from "@/lib/syncErpCache";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { data: settings } = useCommerceSettings();
  const { data: societes = [] } = useSocietes();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSync() {
    setBusy(true);
    setMsg(null);
    try {
      await syncErpCache();
      await qc.invalidateQueries();
      setMsg("Synchronisation ERP réussie (employés, clients, fournisseurs).");
    } catch (err) {
      setMsg(`Sync impossible : ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Administration"
      actions={
        <Button onClick={handleSync} disabled={busy}>
          {busy ? "Sync…" : "Synchroniser depuis ERP"}
        </Button>
      }
    >
      {msg ? (
        <p className="rounded-md bg-[var(--commerce-row)] px-3 py-2 text-sm">{msg}</p>
      ) : null}

      <Panel title="Bridge ERP">
        <p className="text-sm text-[var(--commerce-muted)]">
          Dernière sync :{" "}
          {settings?.last_erp_sync_at
            ? new Date(settings.last_erp_sync_at).toLocaleString("fr-FR")
            : "jamais"}
        </p>
        <p className="mt-2 text-xs text-[var(--commerce-muted)]">
          Variables requises : <code>VITE_ERP_BRIDGE_URL</code>, <code>VITE_ERP_BRIDGE_KEY</code>{" "}
          (secret <code>COMMERCE_BRIDGE_SECRET</code> côté ERP).
        </p>
      </Panel>

      <Panel title="Sociétés d'exploitation" className="mt-4" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Bridge URL</TableHead>
              <TableHead>Actif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {societes.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-semibold">{s.code}</TableCell>
                <TableCell>{s.nom}</TableCell>
                <TableCell className="max-w-xs truncate text-xs">
                  {s.erp_bridge_url ?? "Par défaut (env)"}
                </TableCell>
                <TableCell>{s.actif ? "Oui" : "Non"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t px-4 py-2 text-xs text-[var(--commerce-muted)]">
          Ajoutez une société dans <code>societes_exploitation</code> pour le multi-exploitant.
        </p>
      </Panel>
    </AppShell>
  );
}
