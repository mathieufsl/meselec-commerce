import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ReminderField,
  ReminderRow,
  ReminderSelect,
  ReminderSheetSection,
} from "@/components/commerce/ReminderBlocks";
import { AoDetailSheetDocuments } from "@/components/commerce/AoDetailSheetDocuments";
import { AoDetailSheetSecteurs } from "@/components/commerce/AoDetailSheetSecteurs";
import { AoDocumentFullscreenViewer } from "@/components/commerce/AoDocumentFullscreenViewer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  useAppelOffre,
  useAppelsOffres,
  useClients,
  useSocietes,
  useSyncAoSecteurs,
  useUpsertAppelOffre,
} from "@/hooks/useCommerceData";
import { isFormDirty, toForm, toPayload, type AoDetailFormState } from "@/lib/aoDetailForm";
import {
  emptySecteurDraft,
  patchBailSecteurFields,
  type AoSecteurDraft,
} from "@/lib/aoCreateForm";
import {
  AO_SECTEURS,
  AO_STATUT_LABELS,
  AO_STATUTS,
  type AoPrestation,
  type AoSecteurCode,
  type AoStatut,
} from "@/lib/commerceTypes";
import { cn } from "@/lib/utils";
import type { AoDocument } from "@/lib/commerceTypes";
import {
  Building2,
  Calendar,
  CalendarRange,
  Check,
  ChevronRight,
  Clock,
  Euro,
  FileText,
  ListTree,
  MapPin,
  Tag,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";
import { extractAoAnnonceUrl } from "@/lib/aoNotes";

export function AoDetailSheet({
  aoId,
  open,
  onOpenChange,
}: {
  aoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: ao } = useAppelOffre(aoId ?? "");
  const { data: allAos = [] } = useAppelsOffres();
  const { data: clients = [] } = useClients();
  const { data: societes = [] } = useSocietes();
  const upsertAo = useUpsertAppelOffre();
  const syncSecteurs = useSyncAoSecteurs();

  const [form, setForm] = useState<AoDetailFormState | null>(null);
  const [baseline, setBaseline] = useState<AoDetailFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<AoDocument | null>(null);

  const isDirty = useMemo(
    () => (form && baseline ? isFormDirty(baseline, form) : false),
    [form, baseline],
  );
  const annonceUrl = useMemo(() => extractAoAnnonceUrl(form?.notes), [form?.notes]);

  useEffect(() => {
    if (!open) setPreviewDoc(null);
  }, [open]);

  useEffect(() => {
    if (!ao || !open) return;
    if (isDirty) return;
    const next = toForm(ao, ao.ao_secteurs ?? []);
    setForm(next);
    setBaseline(next);
    setMsg(null);
  }, [ao, open, isDirty]);

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

  function requestClose() {
    if (isDirty && !window.confirm("Des modifications ne sont pas enregistrées. Fermer ?")) return;
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!ao) return;
    if (
      !window.confirm(
        `Supprimer l'appel d'offres « ${ao.reference} » ? Il sera retiré du pipeline.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await upsertAo.mutateAsync({ id: ao.id, statut: "supprime" });
      onOpenChange(false);
    } catch (err) {
      setMsg(`Échec de la suppression : ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
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
      setMsg("Enregistré.");
    } catch (err) {
      setMsg(`Échec : ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function openFullPage() {
    if (!aoId) return;
    if (isDirty && !window.confirm("Des modifications ne sont pas enregistrées. Continuer ?")) return;
    onOpenChange(false);
    void navigate({ to: "/appels-offres/$aoId", params: { aoId } });
  }

  function updateSecteur(localId: string, patch: Partial<AoSecteurDraft>) {
    setForm((f) => {
      if (!f) return f;
      return {
        ...f,
        secteurs: f.secteurs.map((s) =>
          s.localId === localId ? { ...s, ...patchBailSecteurFields(s, patch), ...patch } : s,
        ),
      };
    });
  }

  function addSecteur() {
    setForm((f) => {
      if (!f) return f;
      const used = f.secteurs.map((s) => s.secteur).filter(Boolean) as AoSecteurCode[];
      if (used.length >= AO_SECTEURS.length) return f;
      return { ...f, secteurs: [...f.secteurs, emptySecteurDraft()] };
    });
  }

  function togglePrestation(localId: string, prestation: AoPrestation) {
    setForm((f) => {
      if (!f) return f;
      return {
        ...f,
        secteurs: f.secteurs.map((s) => {
          if (s.localId !== localId) return s;
          const prestations = s.prestations.includes(prestation)
            ? s.prestations.filter((p) => p !== prestation)
            : [...s.prestations, prestation];
          return { ...s, prestations };
        }),
      };
    });
  }

  const bailSecteur = form?.secteurs.find((s) => s.nature_marche === "bail") ?? null;
  const showMarcheDates = Boolean(form?.marche_pluriannuel || bailSecteur);
  const marcheSecteurId = bailSecteur?.localId ?? form?.secteurs[0]?.localId ?? null;

  function updateMarcheDates(patch: Partial<AoSecteurDraft>) {
    if (!marcheSecteurId) return;
    updateSecteur(marcheSecteurId, patch);
  }

  const marcheDates = marcheSecteurId
    ? (form?.secteurs.find((s) => s.localId === marcheSecteurId) ?? null)
    : null;

  const secteurs = form?.secteurs ?? [];
  const usedSecteurs = secteurs.map((s) => s.secteur).filter(Boolean) as AoSecteurCode[];

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
      <SheetContent
        side="bottom"
        overlayClassName="bg-background"
        className="flex h-[min(92dvh,820px)] max-h-[92dvh] flex-col gap-0 rounded-t-2xl border-0 bg-muted p-0 [&>button.absolute]:hidden"
      >
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border/80" />

        <div className="flex shrink-0 items-center justify-between px-3 pb-1 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-card shadow-sm"
            onClick={requestClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </Button>
          <span className="text-sm font-semibold">Détails</span>
          <Button
            type="button"
            size="icon"
            className="h-8 w-8 rounded-full shadow-sm"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving || !form}
          >
            <Check className="h-4 w-4" />
            <span className="sr-only">Enregistrer</span>
          </Button>
        </div>

        {!ao || !form ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Chargement…
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-2">
            <div className="space-y-5">
              {msg ? (
                <p
                  className={cn(
                    "rounded-lg px-3 py-2 text-center text-xs",
                    msg.startsWith("Échec") ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
                  )}
                >
                  {msg}
                </p>
              ) : null}

              <ReminderSheetSection>
                <div className="space-y-1 p-3">
                  <input
                    value={form.titre}
                    onChange={(e) => setForm((f) => (f ? { ...f, titre: e.target.value } : f))}
                    placeholder="Titre de l'appel d'offres"
                    className="w-full border-0 bg-transparent text-lg font-semibold leading-snug text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  <input
                    value={form.reference}
                    onChange={(e) => setForm((f) => (f ? { ...f, reference: e.target.value } : f))}
                    placeholder="Référence"
                    className="w-full border-0 bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => (f ? { ...f, notes: e.target.value } : f))}
                    placeholder="Notes"
                    rows={2}
                    className="mt-1 w-full resize-none border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  {annonceUrl ? (
                    <a
                      href={annonceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ouvrir l&apos;annonce
                    </a>
                  ) : null}
                </div>
              </ReminderSheetSection>

              <ReminderSheetSection title="Organisation">
                <ReminderRow icon={ListTree} label="Statut">
                  <ReminderSelect
                    value={form.statut}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, statut: e.target.value as AoStatut } : f))
                    }
                  >
                    {AO_STATUTS.map((s) => (
                      <option key={s} value={s}>
                        {AO_STATUT_LABELS[s]}
                      </option>
                    ))}
                  </ReminderSelect>
                </ReminderRow>
                <ReminderRow icon={Building2} label="Société">
                  <ReminderSelect
                    value={form.societe_attribuee_id}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, societe_attribuee_id: e.target.value } : f))
                    }
                  >
                    <option value=""></option>
                    {societes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code}
                      </option>
                    ))}
                  </ReminderSelect>
                </ReminderRow>
                <ReminderRow icon={Tag} label="Donneur d'ordre">
                  <ReminderField
                    list="ao-sheet-donneurs"
                    value={form.donneur_ordre_libre}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, donneur_ordre_libre: e.target.value } : f))
                    }
                    placeholder="Saisir…"
                  />
                  <datalist id="ao-sheet-donneurs">
                    {donneurOrdreSuggestions.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </ReminderRow>
                <ReminderRow icon={MapPin} label="Lieu" last>
                  <ReminderField
                    value={form.lieu}
                    onChange={(e) => setForm((f) => (f ? { ...f, lieu: e.target.value } : f))}
                    placeholder="Ville, adresse…"
                  />
                </ReminderRow>
              </ReminderSheetSection>

              <ReminderSheetSection title="Dates">
                <ReminderRow icon={Calendar} label="Publication">
                  <ReminderField
                    type="date"
                    value={form.date_publication}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, date_publication: e.target.value } : f))
                    }
                  />
                </ReminderRow>
                <ReminderRow icon={Clock} label="Échéance dépôt">
                  <ReminderField
                    type="date"
                    value={form.date_limite_depot}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, date_limite_depot: e.target.value } : f))
                    }
                  />
                </ReminderRow>
                <ReminderRow icon={FileText} label="Pluriannuel" last={!showMarcheDates || !marcheDates}>
                  <Checkbox
                    checked={form.marche_pluriannuel}
                    onCheckedChange={(v) =>
                      setForm((f) => (f ? { ...f, marche_pluriannuel: Boolean(v) } : f))
                    }
                  />
                </ReminderRow>
                {showMarcheDates && marcheDates ? (
                  <>
                    <ReminderRow icon={CalendarRange} label="Début marché">
                      <ReminderField
                        type="date"
                        value={marcheDates.bail_date_debut}
                        onChange={(e) => updateMarcheDates({ bail_date_debut: e.target.value })}
                      />
                    </ReminderRow>
                    <ReminderRow icon={CalendarRange} label="Fin marché">
                      <ReminderField
                        type="date"
                        value={marcheDates.bail_date_fin}
                        onChange={(e) => updateMarcheDates({ bail_date_fin: e.target.value })}
                      />
                    </ReminderRow>
                    <ReminderRow icon={Clock} label="Durée (mois)" last>
                      <ReminderField
                        type="number"
                        inputMode="numeric"
                        value={marcheDates.bail_duree_mois}
                        onChange={(e) => updateMarcheDates({ bail_duree_mois: e.target.value })}
                        placeholder=""
                      />
                    </ReminderRow>
                  </>
                ) : null}
              </ReminderSheetSection>

              <ReminderSheetSection title="Montant">
                <ReminderRow icon={Euro} label="Estimé HT" last>
                  <ReminderField
                    type="number"
                    inputMode="decimal"
                    value={form.montant_estime}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, montant_estime: e.target.value } : f))
                    }
                    placeholder="0"
                  />
                </ReminderRow>
              </ReminderSheetSection>

              <AoDetailSheetSecteurs
                secteurs={secteurs}
                usedSecteurs={usedSecteurs}
                onUpdate={updateSecteur}
                onTogglePrestation={togglePrestation}
                onAdd={addSecteur}
                canAdd={usedSecteurs.length < AO_SECTEURS.length}
              />

              {aoId ? (
                <AoDetailSheetDocuments aoId={aoId} onOpenDocument={setPreviewDoc} />
              ) : null}

              <button
                type="button"
                onClick={openFullPage}
                className="flex w-full items-center justify-center gap-1 rounded-xl border border-border/50 bg-card py-3 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-muted/30"
              >
                Fiche complète
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={saving}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-medium text-destructive shadow-sm transition-colors hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer cet AO
              </button>
            </div>
          </div>
        )}
      </SheetContent>

      {previewDoc ? (
        <AoDocumentFullscreenViewer doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      ) : null}
    </Sheet>
  );
}
