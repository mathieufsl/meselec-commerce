import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel, StatusBadge } from "@/components/commerce/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAoDocuments,
  useAoLots,
  useAoReponseLignes,
  useAoReponses,
  useAppelOffre,
  useBpuCatalogues,
  useBpuLignes,
  useClients,
  useMemoiresTechniques,
  useSocietes,
  useUpsertAppelOffre,
} from "@/hooks/useCommerceData";
import { supabase } from "@/integrations/supabase/client";
import { executeHandoff } from "@/lib/syncErpCache";
import { AO_STATUT_LABELS, AO_STATUTS } from "@/lib/commerceTypes";
import {
  calcLigneMontant,
  formatEuro,
  isBpuLigneSelectable,
  roundEuro,
  sumReponseLignes,
} from "@/lib/bpuEngine";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/appels-offres/$aoId")({
  component: AoDetailPage,
});

function AoDetailPage() {
  const { aoId } = Route.useParams();
  const qc = useQueryClient();
  const { data: ao } = useAppelOffre(aoId);
  const { data: lots = [] } = useAoLots(aoId);
  const { data: documents = [] } = useAoDocuments(aoId);
  const { data: reponses = [] } = useAoReponses(aoId);
  const { data: catalogues = [] } = useBpuCatalogues();
  const { data: clients = [] } = useClients();
  const { data: societes = [] } = useSocietes();
  const { data: memoires = [] } = useMemoiresTechniques(aoId);
  const upsertAo = useUpsertAppelOffre();

  const reponse = reponses[0];
  const { data: lignes = [] } = useAoReponseLignes(reponse?.id ?? "");
  const { data: catalogueLignes = [] } = useBpuLignes(reponse?.catalogue_id ?? "");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lotForm, setLotForm] = useState({ numero_lot: "", designation: "" });
  const [docForm, setDocForm] = useState({ type: "dce", nom_fichier: "" });
  const [memoireContenu, setMemoireContenu] = useState("");
  const [searchBpu, setSearchBpu] = useState("");

  const clientNom =
    ao?.clients?.nom_entreprise ??
    clients.find((c) => c.id === ao?.donneur_ordre_id)?.nom_entreprise ??
    "Client";

  const filteredBpu = useMemo(() => {
    const q = searchBpu.toLowerCase();
    return catalogueLignes.filter(
      (l) =>
        isBpuLigneSelectable(l) &&
        (!q || l.designation.toLowerCase().includes(q) || l.numero_prix.includes(q)),
    );
  }, [catalogueLignes, searchBpu]);

  async function refresh() {
    await qc.invalidateQueries();
  }

  async function updateStatut(statut: (typeof AO_STATUTS)[number]) {
    if (!ao) return;
    await upsertAo.mutateAsync({ id: ao.id, statut });
  }

  async function ensureReponse(catalogueId?: string) {
    const existing = reponses[0];
    if (existing) return existing;
    const { data, error } = await supabase
      .from("ao_reponses")
      .insert({
        ao_id: aoId,
        catalogue_id: catalogueId ?? catalogues[0]?.id ?? null,
        statut: "brouillon",
      })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data;
  }

  async function addLot() {
    if (!lotForm.numero_lot) return;
    await supabase.from("ao_lots").insert({
      ao_id: aoId,
      numero_lot: lotForm.numero_lot,
      designation: lotForm.designation,
      ordre: lots.length,
    });
    setLotForm({ numero_lot: "", designation: "" });
    await refresh();
  }

  async function addDocument() {
    if (!docForm.nom_fichier) return;
    await supabase.from("ao_documents").insert({
      ao_id: aoId,
      type: docForm.type,
      nom_fichier: docForm.nom_fichier,
    });
    setDocForm({ type: "dce", nom_fichier: "" });
    await refresh();
  }

  async function addBpuLigneToReponse(bpuLigneId: string) {
    const rep = await ensureReponse();
    const src = catalogueLignes.find((l) => l.id === bpuLigneId);
    if (!src || !rep) return;
    await supabase.from("ao_reponse_lignes").insert({
      reponse_id: rep.id,
      bpu_ligne_id: src.id,
      numero_prix: src.numero_prix,
      designation: src.designation,
      unite: src.unite,
      quantite: 1,
      pu_ht: src.pu_ht ?? 0,
      montant: calcLigneMontant(1, src.pu_ht ?? 0),
      ordre: lignes.length,
    });
    await supabase.rpc("recalc_ao_reponse_montant", { p_reponse_id: rep.id });
    await refresh();
  }

  async function updateLigneQty(ligneId: string, quantite: number) {
    const ligne = lignes.find((l) => l.id === ligneId);
    if (!ligne || !reponse) return;
    const montant = calcLigneMontant(quantite, ligne.pu_ht);
    await supabase
      .from("ao_reponse_lignes")
      .update({ quantite, montant })
      .eq("id", ligneId);
    await supabase.rpc("recalc_ao_reponse_montant", { p_reponse_id: reponse.id });
    await refresh();
  }

  async function saveMemoire() {
    const version = (memoires[0]?.version ?? 0) + 1;
    await supabase.from("memoires_techniques").insert({
      ao_id: aoId,
      version,
      titre: `Mémoire technique v${version}`,
      contenu_json: { sections: [{ titre: "Présentation", contenu: memoireContenu }] },
      statut: "brouillon",
    });
    setMemoireContenu("");
    await refresh();
  }

  async function runHandoff() {
    if (!ao) return;
    setBusy(true);
    setMsg(null);
    try {
      const montant = reponse?.montant_retenu ?? sumReponseLignes(lignes);
      const result = await executeHandoff({
        ao_id: ao.id,
        reference: ao.reference,
        titre: ao.titre,
        client: clientNom,
        agence: ao.clients?.agence ?? null,
        lieu: ao.lieu,
        type_intervention: ao.type_marche,
        montant_devis: montant,
        lignes_chiffrage: lignes.map((l, i) => ({
          description: `${l.numero_prix} — ${l.designation}`,
          quantite: l.quantite,
          prix_unitaire: l.pu_ht,
          total: l.montant,
          ordre: i,
        })),
        trigger_numero_affaire: true,
      });

      await upsertAo.mutateAsync({
        id: ao.id,
        statut: "gagne",
        chantier_erp_id: result.chantier_id,
        handoff_at: new Date().toISOString(),
        societe_attribuee_id: ao.societe_attribuee_id ?? societes[0]?.id ?? null,
      });

      setMsg(`Handoff OK — chantier ERP ${result.chantier_id}`);
    } catch (err) {
      setMsg(`Handoff échoué : ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!ao) {
    return (
      <AppShell title="Appel d'offres">
        <p className="text-sm text-[var(--commerce-muted)]">Chargement…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={ao.reference}
      subtitle={ao.titre}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link to="/appels-offres">
            <Button variant="outline" size="sm">
              Retour
            </Button>
          </Link>
          {ao.statut !== "gagne" ? (
            <Button size="sm" onClick={runHandoff} disabled={busy}>
              {busy ? "Handoff…" : "Attribuer & créer chantier ERP"}
            </Button>
          ) : null}
        </div>
      }
    >
      {msg ? (
        <p className="rounded-md bg-[var(--commerce-row)] px-3 py-2 text-sm">{msg}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge statut={ao.statut} labels={AO_STATUT_LABELS} />
        <select
          className="h-8 rounded-md border px-2 text-xs"
          value={ao.statut}
          onChange={(e) => updateStatut(e.target.value as (typeof AO_STATUTS)[number])}
        >
          {AO_STATUTS.map((s) => (
            <option key={s} value={s}>
              {AO_STATUT_LABELS[s]}
            </option>
          ))}
        </select>
        {ao.chantier_erp_id ? (
          <span className="text-xs text-[var(--commerce-good)]">
            Chantier ERP : {ao.chantier_erp_id}
          </span>
        ) : null}
      </div>

      <Tabs defaultValue="chiffrage" className="mt-4">
        <TabsList>
          <TabsTrigger value="chiffrage">Chiffrage</TabsTrigger>
          <TabsTrigger value="lots">Lots</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="memoire">Mémoire technique</TabsTrigger>
        </TabsList>

        <TabsContent value="chiffrage" className="mt-4 space-y-4">
          <Panel title="Réponse chiffrée">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-md border px-2 text-sm"
                value={reponse?.catalogue_id ?? ""}
                onChange={async (e) => {
                  const rep = await ensureReponse(e.target.value);
                  await supabase
                    .from("ao_reponses")
                    .update({ catalogue_id: e.target.value })
                    .eq("id", rep.id);
                  await refresh();
                }}
              >
                <option value="">Choisir un catalogue BPU/DPGF</option>
                {catalogues.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({c.type.toUpperCase()})
                  </option>
                ))}
              </select>
              <span className="text-sm font-semibold">
                Total : {formatEuro(reponse?.montant_retenu ?? sumReponseLignes(lignes))}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Qté</TableHead>
                  <TableHead>PU HT</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.numero_prix}</TableCell>
                    <TableCell>{l.designation}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-20"
                        value={l.quantite}
                        onChange={(e) => updateLigneQty(l.id, Number(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>{formatEuro(l.pu_ht)}</TableCell>
                    <TableCell className="text-right">{formatEuro(l.montant)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>

          {reponse?.catalogue_id ? (
            <Panel title="Ajouter des lignes BPU">
              <Input
                placeholder="Rechercher…"
                value={searchBpu}
                onChange={(e) => setSearchBpu(e.target.value)}
                className="mb-3 max-w-sm"
              />
              <div className="max-h-64 overflow-auto rounded border">
                <Table>
                  <TableBody>
                    {filteredBpu.slice(0, 50).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="w-24">{l.numero_prix}</TableCell>
                        <TableCell>{l.designation}</TableCell>
                        <TableCell>{formatEuro(l.pu_ht)}</TableCell>
                        <TableCell className="w-24">
                          <Button size="sm" variant="outline" onClick={() => addBpuLigneToReponse(l.id)}>
                            +
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Panel>
          ) : null}
        </TabsContent>

        <TabsContent value="lots" className="mt-4">
          <Panel title="Lots">
            <div className="mb-3 flex flex-wrap gap-2">
              <Input
                placeholder="N° lot"
                value={lotForm.numero_lot}
                onChange={(e) => setLotForm((f) => ({ ...f, numero_lot: e.target.value }))}
                className="w-28"
              />
              <Input
                placeholder="Désignation"
                value={lotForm.designation}
                onChange={(e) => setLotForm((f) => ({ ...f, designation: e.target.value }))}
                className="max-w-md flex-1"
              />
              <Button size="sm" onClick={addLot}>
                Ajouter
              </Button>
            </div>
            <Table>
              <TableBody>
                {lots.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell>{lot.numero_lot}</TableCell>
                    <TableCell>{lot.designation}</TableCell>
                    <TableCell className="text-right">{formatEuro(lot.montant_estime)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Panel title="Pièces DCE">
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                className="h-9 rounded-md border px-2 text-sm"
                value={docForm.type}
                onChange={(e) => setDocForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="dce">DCE</option>
                <option value="rc">RC</option>
                <option value="cctp">CCTP</option>
                <option value="dpgf">DPGF</option>
                <option value="bpu">BPU</option>
                <option value="annexe">Annexe</option>
              </select>
              <Input
                placeholder="Nom du fichier"
                value={docForm.nom_fichier}
                onChange={(e) => setDocForm((f) => ({ ...f, nom_fichier: e.target.value }))}
                className="max-w-md flex-1"
              />
              <Button size="sm" onClick={addDocument}>
                Ajouter
              </Button>
            </div>
            <ul className="space-y-1 text-sm">
              {documents.map((d) => (
                <li key={d.id} className="flex justify-between rounded border px-3 py-2">
                  <span>
                    <strong className="uppercase">{d.type}</strong> — {d.nom_fichier}
                  </span>
                  <span className="text-[var(--commerce-muted)]">v{d.version}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="memoire" className="mt-4 space-y-4">
          <Panel title="Nouvelle version">
            <Textarea
              rows={8}
              placeholder="Contenu du mémoire technique…"
              value={memoireContenu}
              onChange={(e) => setMemoireContenu(e.target.value)}
            />
            <Button className="mt-2" size="sm" onClick={saveMemoire} disabled={!memoireContenu.trim()}>
              Enregistrer version
            </Button>
          </Panel>
          <Panel title="Versions">
            <ul className="space-y-2 text-sm">
              {memoires.map((m) => (
                <li key={m.id} className="rounded border px-3 py-2">
                  <strong>{m.titre}</strong> — {m.statut}
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
