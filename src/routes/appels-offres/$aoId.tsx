import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/commerce/AppShell";
import { AoCommentsSheet } from "@/components/commerce/AoCommentsSheet";
import { AoIdentityCard } from "@/components/commerce/AoIdentityCard";
import {
  AoDetailSommaireFloating,
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
  useAppelsOffres,
  useBpuCatalogues,
  useBpuLignes,
  useClients,
  useImportAoReponseLignes,
  useMemoiresTechniques,
  useSocietes,
  useSyncAoSecteurs,
  useUpsertAppelOffre,
} from "@/hooks/useCommerceData";
import { supabase } from "@/integrations/supabase/client";
import { isFormDirty, toForm, toPayload, type AoDetailFormState } from "@/lib/aoDetailForm";
import { executeHandoff } from "@/lib/syncErpCache";
import { type AoReponse } from "@/lib/commerceTypes";
import {
  calcLigneMontant,
  formatEuro,
  isBpuLigneSelectable,
  sumReponseLignes,
} from "@/lib/bpuEngine";
import { catalogueRowsOnly, parseBpuExcelFile } from "@/lib/bpuExcelImport";
import { filterAoDocumentsByAllowedTypes } from "@/lib/aoDocuments";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cleanDisplaySeparators } from "@/lib/displayText";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/appels-offres/$aoId")({
  component: AoDetailPage,
});

const AO_SECTIONS: AoSection[] = [
  { id: "projet", label: "Fiche projet", number: 1 },
  { id: "documents", label: "Documents", number: 2 },
  { id: "historique", label: "Historique réponses", number: 3 },
  { id: "chiffrage", label: "Chiffrage", number: 4 },
  { id: "memoire", label: "Mémoire technique", number: 5 },
];

function AoDetailPage() {
  const { aoId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: ao } = useAppelOffre(aoId);
  const { data: allAos = [] } = useAppelsOffres();
  const { data: documents = [] } = useAoDocuments(aoId);
  const allowedDocumentCount = useMemo(
    () => filterAoDocumentsByAllowedTypes(documents).length,
    [documents],
  );
  const { data: reponses = [] } = useAoReponses(aoId);
  const { data: catalogues = [] } = useBpuCatalogues();
  const { data: clients = [] } = useClients();
  const { data: societes = [] } = useSocietes();
  const { data: memoires = [] } = useMemoiresTechniques(aoId);
  const upsertAo = useUpsertAppelOffre();
  const syncSecteurs = useSyncAoSecteurs();
  const importReponse = useImportAoReponseLignes();

  const [form, setForm] = useState<AoDetailFormState | null>(null);
  const [baseline, setBaseline] = useState<AoDetailFormState | null>(null);
  const [saving, setSaving] = useState(false);

  const sectionIds = useMemo(() => AO_SECTIONS.map((s) => s.id), []);
  const { activeId, navigate: scrollToSection } = useAoSectionObserver(sectionIds);

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

  const isDirty = useMemo(
    () => (form && baseline ? isFormDirty(baseline, form) : false),
    [form, baseline],
  );

  useEffect(() => {
    if (!ao) return;
    if (isDirty) return;
    const next = toForm(ao, ao.ao_secteurs ?? []);
    setForm(next);
    setBaseline(next);
  }, [ao, isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const donneurOrdreSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const c of clients) {
      if (c.nom_entreprise?.trim()) set.add(c.nom_entreprise.trim());
    }
    for (const item of allAos) {
      if (item.donneur_ordre_libre?.trim()) set.add(item.donneur_ordre_libre.trim());
      if (item.clients?.nom_entreprise?.trim()) set.add(item.clients.nom_entreprise.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [clients, allAos]);

  const clientNom =
    form?.donneur_ordre_libre?.trim() ||
    ao?.donneur_ordre_libre?.trim() ||
    ao?.clients?.nom_entreprise ||
    clients.find((c) => c.id === ao?.donneur_ordre_id)?.nom_entreprise ||
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

  async function handleSave() {
    if (!ao || !form) return;
    setSaving(true);
    setMsg(null);
    try {
      const { ao: payload, secteurs } = toPayload(form);
      await upsertAo.mutateAsync({ id: ao.id, ...payload });
      const savedSecteurs = await syncSecteurs.mutateAsync({ aoId: ao.id, secteurs });
      const fresh = toForm({ ...ao, ...payload }, savedSecteurs);
      setBaseline(fresh);
      setForm(fresh);
      await refresh();
      setMsg("Fiche enregistrée.");
    } catch (err) {
      setMsg(`Échec : ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function navigateBackToList() {
    if (
      isDirty &&
      !window.confirm("Des modifications ne sont pas enregistrées. Quitter cette fiche ?")
    ) {
      return;
    }
    void navigate({ to: "/appels-offres" });
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
      subtitle={cleanDisplaySeparators(ao.titre)}
      back={{ to: "/appels-offres", label: "Retour liste", onNavigate: navigateBackToList }}
      flush
      belowHeader={<AoImportBanner aoId={aoId} />}
      contentClassName="flex min-h-0 flex-col px-3 py-3 sm:px-6 sm:py-4"
      mobileFooter={
        <div className="flex items-center gap-2 px-3 py-2">
          {isDirty ? (
            <span className="shrink-0 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">
              Non enregistré
            </span>
          ) : null}
          <Button
            size="sm"
            className="min-w-0 flex-1"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <AoCommentsSheet aoId={aoId} className="h-9 w-9 shrink-0 p-0 [&_span]:sr-only" />
        </div>
      }
      actions={
        <div className="hidden items-center gap-2 lg:flex">
          {isDirty ? (
            <span className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
              Non enregistré
            </span>
          ) : null}
          <Button size="sm" onClick={() => void handleSave()} disabled={!isDirty || saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <AoCommentsSheet aoId={aoId} />
          {ao.statut !== "gagne" && reponse ? (
            <Button size="sm" variant="outline" onClick={runHandoff} disabled={busy || lignes.length === 0}>
              {busy ? "Handoff…" : "Attribuer & créer chantier ERP"}
            </Button>
          ) : null}
        </div>
      }
    >
      {msg ? (
        <p className="mb-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">{msg}</p>
      ) : null}

      <AoDetailSommaireFloating
        sections={AO_SECTIONS}
        activeId={activeId}
        onNavigate={scrollToSection}
      />

      <div className="min-w-0 flex-1 space-y-6 pb-4 lg:space-y-10 lg:pb-12">
          {/* Section 1 — Fiche projet */}
          <section id="projet" className="scroll-mt-24">
            <Panel title="Fiche projet" bodyClassName="space-y-4">
              {form ? (
                <>
                  <AoIdentityCard
                    form={form}
                    onChange={(patch) => setForm((f) => (f ? { ...f, ...patch } : f))}
                    societes={societes}
                    donneurOrdreSuggestions={donneurOrdreSuggestions}
                    mode="detail"
                  />
                  <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Réponses enregistrées
                      </label>
                      <p className="mt-1 text-sm font-semibold">{reponses.length}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Documents</label>
                      <p className="mt-1 text-sm font-semibold">{allowedDocumentCount}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              )}
            </Panel>
          </section>

          {/* Documents — sous la fiche, liste verticale sur mobile */}
          <section id="documents" className="scroll-mt-24">
            <AoDocumentsWorkspace aoId={aoId} />
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
                          {r.source_fichier ?? ""}
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
                        <TableCell>{l.unite ?? ""}</TableCell>
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
