import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ReminderField,
  ReminderRow,
  ReminderSelect,
  ReminderSheetSection,
} from "@/components/commerce/ReminderBlocks";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCeDossier, useUpsertCeDossier } from "@/hooks/useCeData";
import { isFormDirty, toForm, toPayload, type CeDetailFormState } from "@/lib/ceDetailForm";
import { formatCeAmountDisplay, parseCeAmountInput } from "@/lib/ceMoneyInput";
import {
  CE_SITUATION_LABELS,
  CE_SITUATIONS,
  CE_STATUT_LABELS,
  CE_STATUTS,
  type CeSituationJuridique,
  type CeStatut,
} from "@/lib/commerceTypes";
import { cn } from "@/lib/utils";
import {
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Euro,
  MapPin,
  Scale,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";

export function CeDetailSheet({
  dossierId,
  open,
  onOpenChange,
}: {
  dossierId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: dossier } = useCeDossier(dossierId ?? "");
  const upsert = useUpsertCeDossier();

  const [form, setForm] = useState<CeDetailFormState | null>(null);
  const [baseline, setBaseline] = useState<CeDetailFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isDirty = useMemo(
    () => (form && baseline ? isFormDirty(baseline, form) : false),
    [form, baseline],
  );

  useEffect(() => {
    if (!dossier || !open) return;
    if (isDirty) return;
    const next = toForm(dossier);
    setForm(next);
    setBaseline(next);
    setMsg(null);
  }, [dossier, open, isDirty]);

  function requestClose() {
    if (isDirty && !window.confirm("Des modifications ne sont pas enregistrées. Fermer ?")) return;
    onOpenChange(false);
  }

  async function handleSave() {
    if (!dossier || !form) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload = toPayload(form);
      await upsert.mutateAsync({ id: dossier.id, ...payload });
      const fresh = toForm({ ...dossier, ...payload });
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
    if (!dossierId) return;
    if (isDirty && !window.confirm("Des modifications ne sont pas enregistrées. Continuer ?")) {
      return;
    }
    onOpenChange(false);
    void navigate({ to: "/ce/$dossierId", params: { dossierId } });
  }

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
          <span className="text-sm font-semibold">Détails CE</span>
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

        {!dossier || !form ? (
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
                    msg.startsWith("Échec")
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {msg}
                </p>
              ) : null}

              <ReminderSheetSection>
                <div className="space-y-1 p-3">
                  <input
                    value={form.nom_cible}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, nom_cible: e.target.value } : f))
                    }
                    placeholder="Raison sociale"
                    className="w-full border-0 bg-transparent text-lg font-semibold leading-snug text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  <p className="text-sm text-muted-foreground">{dossier.reference}</p>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => (f ? { ...f, notes: e.target.value } : f))}
                    placeholder="Notes"
                    rows={2}
                    className="mt-1 w-full resize-none border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </ReminderSheetSection>

              <ReminderSheetSection title="Identification">
                <ReminderRow icon={Building2} label="Activité">
                  <ReminderField
                    value={form.activite}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, activite: e.target.value } : f))
                    }
                    placeholder="Métier…"
                  />
                </ReminderRow>
                <ReminderRow icon={MapPin} label="Lieu" last>
                  <ReminderField
                    value={form.lieu}
                    onChange={(e) => setForm((f) => (f ? { ...f, lieu: e.target.value } : f))}
                    placeholder="Siège…"
                  />
                </ReminderRow>
              </ReminderSheetSection>

              <ReminderSheetSection title="Suivi">
                <ReminderRow icon={Scale} label="Situation">
                  <ReminderSelect
                    value={form.situation_juridique}
                    onChange={(e) =>
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              situation_juridique: e.target.value as CeSituationJuridique,
                            }
                          : f,
                      )
                    }
                  >
                    {CE_SITUATIONS.map((s) => (
                      <option key={s} value={s}>
                        {CE_SITUATION_LABELS[s]}
                      </option>
                    ))}
                  </ReminderSelect>
                </ReminderRow>
                {form.situation_juridique === "redressement" ? (
                  <ReminderRow icon={Calendar} label="Échéance offre">
                    <ReminderField
                      type="date"
                      value={form.date_echeance_offre}
                      onChange={(e) =>
                        setForm((f) =>
                          f ? { ...f, date_echeance_offre: e.target.value } : f,
                        )
                      }
                    />
                  </ReminderRow>
                ) : null}
                <ReminderRow icon={Tag} label="Pipeline">
                  <ReminderSelect
                    value={form.statut}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, statut: e.target.value as CeStatut } : f,
                      )
                    }
                  >
                    {CE_STATUTS.map((s) => (
                      <option key={s} value={s}>
                        {CE_STATUT_LABELS[s]}
                      </option>
                    ))}
                  </ReminderSelect>
                </ReminderRow>
                <ReminderRow icon={User} label="Contact" last>
                  <ReminderField
                    value={form.interlocuteur}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, interlocuteur: e.target.value } : f))
                    }
                    placeholder="Interlocuteur…"
                  />
                </ReminderRow>
              </ReminderSheetSection>

              <ReminderSheetSection title="Chiffres">
                <ReminderRow icon={Euro} label="CA">
                  <ReminderField
                    inputMode="decimal"
                    value={formatCeAmountDisplay(form.ca_estime)}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, ca_estime: parseCeAmountInput(e.target.value) } : f,
                      )
                    }
                    placeholder="0"
                    className="tabular-nums"
                  />
                </ReminderRow>
                <ReminderRow icon={Euro} label="EBITDA">
                  <ReminderField
                    inputMode="decimal"
                    value={formatCeAmountDisplay(form.ebitda_estime)}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, ebitda_estime: parseCeAmountInput(e.target.value) } : f,
                      )
                    }
                    placeholder="0"
                    className="tabular-nums"
                  />
                </ReminderRow>
                <ReminderRow icon={Euro} label="Valorisation">
                  <ReminderField
                    inputMode="decimal"
                    value={formatCeAmountDisplay(form.valorisation_estimee)}
                    onChange={(e) =>
                      setForm((f) =>
                        f
                          ? { ...f, valorisation_estimee: parseCeAmountInput(e.target.value) }
                          : f,
                      )
                    }
                    placeholder="0"
                    className="tabular-nums"
                  />
                </ReminderRow>
                <ReminderRow icon={Users} label="Effectif" last>
                  <ReminderField
                    type="number"
                    inputMode="numeric"
                    value={form.effectif}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, effectif: e.target.value } : f))
                    }
                    placeholder="0"
                  />
                </ReminderRow>
              </ReminderSheetSection>

              <ReminderSheetSection title="Dates">
                <ReminderRow icon={Calendar} label="Détection">
                  <ReminderField
                    type="date"
                    value={form.date_detection}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, date_detection: e.target.value } : f))
                    }
                  />
                </ReminderRow>
                <ReminderRow icon={Calendar} label="Closing cible" last>
                  <ReminderField
                    type="date"
                    value={form.date_closing_cible}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, date_closing_cible: e.target.value } : f,
                      )
                    }
                  />
                </ReminderRow>
              </ReminderSheetSection>

              <button
                type="button"
                onClick={openFullPage}
                className="flex w-full items-center justify-center gap-1 rounded-xl border border-border/50 bg-card py-3 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-muted/30"
              >
                Fiche complète
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
