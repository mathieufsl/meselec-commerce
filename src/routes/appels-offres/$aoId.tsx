import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Panel, StatusBadge } from "@/components/commerce/AppShell";
import { AoCommentsSheet } from "@/components/commerce/AoCommentsSheet";
import {
  AoDetailSommaireFloating,
  AoDetailSommaireMobile,
  useAoSectionObserver,
  type AoSection,
} from "@/components/commerce/AoDetailSommaire";
import { AoDocumentsWorkspace } from "@/components/commerce/AoDocumentsWorkspace";
import { AoImportBanner } from "@/components/commerce/AoImportBanner";
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
import {
  useAoDocuments,
  useAoReponseLignes,
  useAoReponses,
  useAppelOffre,
  useBpuCatalogues,
  useBpuLignes,
  useClients,
  useImportAoReponseLignes,
  useMemoiresTechniques,
  useSocietes,
  useUpsertAppelOffre,
} from "@/hooks/useCommerceData";
import { supabase } from "@/integrations/supabase/client";
import { executeHandoff } from "@/lib/syncErpCache";
import { AO_STATUT_LABELS, AO_STATUTS, type AoReponse } from "@/lib/commerceTypes";
import {
  calcLigneMontant,
  formatEuro,
  isBpuLigneSelectable,
  sumReponseLignes,
} from "@/lib/bpuEngine";
import { catalogueRowsOnly, parseBpuExcelFile } from "@/lib/bpuExcelImport";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/appels-offres/$aoId")({
  component: AoDetailPage,
});

const AO_SECTIONS: AoSection[] = [
  { id: "projet", label: "Fiche projet", number: 1 },
  { id: "historique", label: "Historique réponses", number: 2 },
  { id: "chiffrage", label: "Chiffrage", number: 3 },
  { id: "documents", label: "Documents", number: 4 },
  { id: "memoire", label: "Mémoire technique", number: 5 },
];

function AoDetailPage() {
  const { aoId } = Route.useParams();
  const qc = useQueryClient();
  const { data: ao } = useAppelOffre(aoId);
  const { data: documents = [] } = useAoDocuments(aoId);
  const { data: reponses = [] } = useAoReponses(aoId);
  const { data: catalogues = [] } = useBpuCatalogues();
  const { data: clients = [] } = useClients();
  const { data: societes = [] } = useSocietes();
  const { data: memoires = [] } = useMemoiresTechniques(aoId);
  const upsertAo = useUpsertAppelOffre();
  const importReponse = useImportAoReponseLignes();

  const sectionIds = useMemo(() => AO_SECTIONS.map((s) => s.id), []);
  const { activeId, navigate } = useAoSectionObserver(sectionIds);

  const [selectedReponseId, setSelectedReponseId] = useState<string | null>(null);
  const reponse = reponses.find((r) => r.id === selectedReponseId) ?? reponses[0] ?? null;

  useEffect(() => {
    if (!selectedReponseId && reponses[0]?.id) {
      setSelectedReponseId(reponses[0].id);
    }
  }, [reponses, selectedReponseId]);

  const { data: lignes = [] } = useAoReponseLignes(reponse?.id ?? "");
  const { data: catalogueLignes = [] } = useBpuLignes(reponse?.catalogue_id ?? "");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
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

  async function updateAoField(fields: Record<string, unknown>) {
    if (!ao) return;
    await upsertAo.mutateAsync({ id: ao.id, ...fields });
  }

  async function updateStatut(statut: (typeof AO_STATUTS)[number]) {
    await updateAoField({ statut });
  }

  async function nextReponseVersion(): Promise<number> {
    const max = reponses.reduce((m, r) => Math.max(m, r.version ?? 1), 0);
    return max + 1;
  }

  async function createReponse(opts?: {
    libelle?: string;
    source_fichier?: string;
    catalogue_id?: string | null;
  }): Promise<AoReponse> {
    const version = await nextReponseVersion();
    const { data, error } = await supabase
      .from("ao_reponses")
      .insert({
        ao_id: aoId,
        catalogue_id: opts?.catalogue_id ?? catalogues[0]?.id ?? null,
        statut: "brouillon",
        libelle: opts?.libelle ?? `Réponse v${version}`,
        source_fichier: opts?.source_fichier ?? null,
        version,
      })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    setSelectedReponseId(data.id);
    return data as AoReponse;
  }

  async function ensureReponse(catalogueId?: string) {
    if (reponse) return reponse;
    return createReponse({ catalogue_id: catalogueId ?? null });
  }

  async function addBpuLigneToReponse(bpuLigneId: string) {
    const rep = await ensureReponse(reponse?.catalogue_id ?? undefined);
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
    await supabase.from("ao_reponse_lignes").update({ quantite, montant }).eq("id", ligneId);
    await supabase.rpc("recalc_ao_reponse_montant", { p_reponse_id: reponse.id });
    await refresh();
  }

  async function importExcelReponse(
    result: Awaited<ReturnType<typeof parseBpuExcelFile>>,
  ) {
    const version = await nextReponseVersion();
    const libelle =
      result.meta.titre?.slice(0, 80) ??
      result.meta.fileName?.replace(/\.xlsx$/i, "") ??
      `Import v${version}`;
    const rep = await createReponse({
      libelle,
      ...(result.meta.fileName ? { source_fichier: result.meta.fileName } : {}),
    });

    const rows =
      result.mode === "reponse"
        ? result.reponseRows.map((l, i) => ({
            numero_prix: l.numero_prix,
            designation: l.designation,
            unite: l.unite,
            quantite: l.quantite ?? 1,
            pu_ht: l.pu_ht,
            ordre: i,
          }))
        : catalogueRowsOnly(result.catalogueRows).map((l, i) => ({
            numero_prix: l.numero_prix,
            designation: l.designation,
            unite: l.unite,
            quantite: 1,
            pu_ht: l.pu_ht,
            ordre: i,
          }));

    await importReponse.mutateAsync({ reponseId: rep.id, lignes: rows, replace: true });
    await supabase
      .from("ao_reponses")
      .update({ statut: result.mode === "reponse" ? "finalise" : "brouillon" })
      .eq("id", rep.id);
    setMsg(`${rows.length} ligne(s) importée(s) — ${libelle}`);
    await refresh();
  }

  async function importExcelFromFile(file: File) {
    const result = await parseBpuExcelFile(file);
    await importExcelReponse(result);
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
    if (!ao || !reponse) return;
    setBusy(true);
    setMsg(null);
    try {
      const montant = reponse.montant_retenu ?? sumReponseLignes(lignes);
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
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={ao.reference}
      subtitle={ao.titre}
      back={{ to: "/appels-offres", label: "Retour liste" }}
      flush
      belowHeader={<AoImportBanner aoId={aoId} onExcelImport={importExcelFromFile} />}
      contentClassName="flex min-h-0 flex-col px-4 py-4 sm:px-6"
      actions={
        <div className="flex items-center gap-2">
          <AoCommentsSheet aoId={aoId} />
          {ao.statut !== "gagne" && reponse ? (
            <Button size="sm" onClick={runHandoff} disabled={busy || lignes.length === 0}>
              {busy ? "Handoff…" : "Attribuer & créer chantier ERP"}
            </Button>
          ) : null}
        </div>
      }
    >
      {msg ? (
        <p className="mb-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">{msg}</p>
      ) : null}

      <AoDetailSommaireMobile
        sections={AO_SECTIONS}
        activeId={activeId}
        onNavigate={navigate}
      />

      <AoDetailSommaireFloating
        sections={AO_SECTIONS}
        activeId={activeId}
        onNavigate={navigate}
      />

      <div className="min-w-0 flex-1 space-y-10 pb-12">
          {/* Section 1 — Fiche projet */}
          <section id="projet" className="scroll-mt-24">
            <Panel title="Fiche projet" bodyClassName="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="md:col-span-2 xl:col-span-3">
                  <label className="text-xs font-medium text-muted-foreground">Titre</label>
                  <Input
                    className="mt-1"
                    value={ao.titre}
                    onChange={(e) => void updateAoField({ titre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Client / donneur d&apos;ordre
                  </label>
                  <p className="mt-1 text-sm font-medium">{clientNom}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Lieu</label>
                  <Input
                    className="mt-1"
                    value={ao.lieu ?? ""}
                    onChange={(e) => void updateAoField({ lieu: e.target.value || null })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type de marché</label>
                  <Input
                    className="mt-1"
                    value={ao.type_marche ?? ""}
                    onChange={(e) => void updateAoField({ type_marche: e.target.value || null })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date publication</label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={ao.date_publication?.slice(0, 10) ?? ""}
                    onChange={(e) =>
                      void updateAoField({ date_publication: e.target.value || null })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Échéance dépôt</label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={ao.date_limite_depot?.slice(0, 10) ?? ""}
                    onChange={(e) =>
                      void updateAoField({ date_limite_depot: e.target.value || null })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Montant estimé (€ HT)</label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={ao.montant_estime ?? ""}
                    onChange={(e) =>
                      void updateAoField({
                        montant_estime: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Statut</label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
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
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Société d&apos;exploitation
                  </label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                    value={ao.societe_attribuee_id ?? ""}
                    onChange={(e) =>
                      void updateAoField({ societe_attribuee_id: e.target.value || null })
                    }
                  >
                    <option value="">—</option>
                    {societes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Réponses enregistrées</label>
                  <p className="mt-1 text-sm font-semibold">{reponses.length}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Documents</label>
                  <p className="mt-1 text-sm font-semibold">{documents.length}</p>
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <label className="text-xs font-medium text-muted-foreground">Notes internes</label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    value={ao.notes ?? ""}
                    onChange={(e) => void updateAoField({ notes: e.target.value || null })}
                  />
                </div>
              </div>
            </Panel>
          </section>

          {/* Section 2 — Historique réponses */}
          <section id="historique" className="scroll-mt-24 space-y-4">
            <Panel title="Importer une réponse Excel">
              <p className="mb-3 text-sm text-muted-foreground">
                Importe un BPU (prix unitaires) ou un chiffrage Meselec (quantités + prix) comme
                nouvelle version de réponse.
              </p>
              <BpuExcelImportPanel onImport={importExcelReponse} />
            </Panel>

            <Panel title={`${reponses.length} réponse(s) enregistrée(s)`} bodyClassName="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant HT</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reponses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Aucune réponse — importez un fichier Excel ou créez un chiffrage.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reponses.map((r) => (
                      <TableRow
                        key={r.id}
                        className={cn(r.id === reponse?.id && "bg-primary/5")}
                      >
                        <TableCell>v{r.version}</TableCell>
                        <TableCell className="font-medium">{r.libelle}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                          {r.source_fichier ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.statut}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatEuro(r.montant_retenu)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={r.id === reponse?.id ? "default" : "outline"}
                            onClick={() => setSelectedReponseId(r.id)}
                          >
                            Voir lignes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Panel>

            {reponse ? (
              <Panel
                title={`Lignes — ${reponse.libelle}`}
                description={`${lignes.length} ligne(s) · ${formatEuro(reponse.montant_retenu ?? sumReponseLignes(lignes))} HT`}
                bodyClassName="p-0"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead>U</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">PU HT</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lignes.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap">{l.numero_prix}</TableCell>
                        <TableCell>{l.designation}</TableCell>
                        <TableCell>{l.unite ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.quantite}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatEuro(l.pu_ht)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatEuro(l.montant)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Panel>
            ) : null}
          </section>

          {/* Section 3 — Chiffrage */}
          <section id="chiffrage" className="scroll-mt-24 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void createReponse()}>
                Nouvelle réponse vide
              </Button>
              {reponses.length > 0 ? (
                <select
                  className="h-9 rounded-md border px-2 text-sm"
                  value={reponse?.id ?? ""}
                  onChange={(e) => setSelectedReponseId(e.target.value)}
                >
                  {reponses.map((r) => (
                    <option key={r.id} value={r.id}>
                      v{r.version} — {r.libelle}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <Panel title="Réponse chiffrée">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select
                  className="h-9 rounded-md border px-2 text-sm"
                  value={reponse?.catalogue_id ?? ""}
                  onChange={async (e) => {
                    const rep = await ensureReponse(e.target.value);
                    await supabase
                      .from("ao_reponses")
                      .update({ catalogue_id: e.target.value || null })
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
                  {lignes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        Aucune ligne — importez un Excel ou ajoutez depuis le catalogue.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lignes.map((l) => (
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
                    ))
                  )}
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addBpuLigneToReponse(l.id)}
                            >
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
          </section>

          {/* Section 4 — Documents */}
          <section id="documents" className="scroll-mt-24">
            <AoDocumentsWorkspace aoId={aoId} />
          </section>

          {/* Section 5 — Mémoire technique */}
          <section id="memoire" className="scroll-mt-24 space-y-4">
            <Panel title="Nouvelle version">
              <Textarea
                rows={8}
                placeholder="Contenu du mémoire technique…"
                value={memoireContenu}
                onChange={(e) => setMemoireContenu(e.target.value)}
              />
              <Button
                className="mt-2"
                size="sm"
                onClick={saveMemoire}
                disabled={!memoireContenu.trim()}
              >
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
          </section>
      </div>
    </AppShell>
  );
}
