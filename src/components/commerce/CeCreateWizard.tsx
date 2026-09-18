import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { CeMoneyInput } from "@/components/commerce/CeMoneyInput";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCeDossiers, useCreateCeDossier } from "@/hooks/useCeData";
import {
  emptyCreateForm,
  suggestNextCeReference,
  toCreatePayload,
  validateCreateStep,
  type CeCreateFormState,
} from "@/lib/ceCreateForm";
import {
  CE_SITUATION_LABELS,
  CE_SITUATIONS,
  type CeSituationJuridique,
} from "@/lib/commerceTypes";
import { formatEuro } from "@/lib/bpuEngine";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const STEPS = [
  { id: "identification", label: "Identification" },
  { id: "situation", label: "Situation" },
  { id: "organisation", label: "Organisation" },
  { id: "recap", label: "Récapitulatif" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function CeCreateWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: dossiers = [] } = useCeDossiers();
  const createDossier = useCreateCeDossier();
  const isMobile = useIsMobile();

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<CeCreateFormState>(() => emptyCreateForm());
  const [suggestedRef, setSuggestedRef] = useState(() => suggestNextCeReference([]));
  const [error, setError] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  const currentStepMeta = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setForm(emptyCreateForm());
      setSuggestedRef(suggestNextCeReference(dossiers.map((d) => d.reference)));
      setCurrentStep(0);
      setError(null);
    }
    wasOpenRef.current = open;
  }, [open, dossiers]);

  function patch(next: Partial<CeCreateFormState>) {
    setForm((f) => ({ ...f, ...next }));
  }

  function goNext() {
    const err = validateCreateStep(currentStepMeta?.id ?? "", form);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      void handleSubmit();
    }
  }

  function goPrev() {
    setError(null);
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit() {
    const err = validateCreateStep("recap", form);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    try {
      const reference = suggestNextCeReference(dossiers.map((d) => d.reference));
      const payload = toCreatePayload(form, reference);
      const created = await createDossier.mutateAsync(payload);
      onOpenChange(false);
      await navigate({ to: "/ce/$dossierId", params: { dossierId: created.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la création");
    }
  }

  function renderStep() {
    const id = currentStepMeta?.id as StepId;
    switch (id) {
      case "identification":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Raison sociale *</span>
              <Input
                value={form.nom_cible}
                onChange={(e) => patch({ nom_cible: e.target.value })}
                placeholder="Entreprise / fonds de commerce"
                autoFocus
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Activité</span>
              <Input
                value={form.activite}
                onChange={(e) => patch({ activite: e.target.value })}
                placeholder="Métier, secteur…"
              />
            </label>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Référence attribuée automatiquement :{" "}
              <span className="font-medium text-foreground">{suggestedRef}</span>
            </p>
          </div>
        );
      case "situation":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Situation juridique *</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.situation_juridique}
                onChange={(e) =>
                  patch({ situation_juridique: e.target.value as CeSituationJuridique })
                }
              >
                {CE_SITUATIONS.map((s) => (
                  <option key={s} value={s}>
                    {CE_SITUATION_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            {form.situation_juridique === "redressement" ? (
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Date échéance offre *
                </span>
                <Input
                  type="date"
                  value={form.date_echeance_offre}
                  onChange={(e) => patch({ date_echeance_offre: e.target.value })}
                />
              </label>
            ) : null}
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Lieu</span>
              <Input
                value={form.lieu}
                onChange={(e) => patch({ lieu: e.target.value })}
                placeholder="Siège, zone…"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">CA estimé (€)</span>
              <CeMoneyInput
                value={form.ca_estime}
                onChange={(v) => patch({ ca_estime: v })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">EBITDA estimé (€)</span>
              <CeMoneyInput
                value={form.ebitda_estime}
                onChange={(v) => patch({ ebitda_estime: v })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Valorisation (€)</span>
              <CeMoneyInput
                value={form.valorisation_estimee}
                onChange={(v) => patch({ valorisation_estimee: v })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Effectif</span>
              <Input
                type="number"
                value={form.effectif}
                onChange={(e) => patch({ effectif: e.target.value })}
              />
            </label>
          </div>
        );
      case "organisation":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Interlocuteur</span>
              <Input
                value={form.interlocuteur}
                onChange={(e) => patch({ interlocuteur: e.target.value })}
                placeholder="Contact côté cible"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Date de détection</span>
              <Input
                type="date"
                value={form.date_detection}
                onChange={(e) => patch({ date_detection: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Closing cible</span>
              <Input
                type="date"
                value={form.date_closing_cible}
                onChange={(e) => patch({ date_closing_cible: e.target.value })}
              />
            </label>
          </div>
        );
      case "recap":
        return (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Vérifiez le dossier avant création. Vous pourrez le modifier ensuite.
            </p>
            <dl className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
              <RecapItem label="Référence" value={suggestedRef} />
              <RecapItem label="Raison sociale" value={form.nom_cible} />
              <RecapItem label="Activité" value={form.activite || "—"} />
              <RecapItem
                label="Situation"
                value={
                  form.situation_juridique
                    ? CE_SITUATION_LABELS[form.situation_juridique]
                    : "—"
                }
              />
              {form.situation_juridique === "redressement" ? (
                <RecapItem
                  label="Échéance offre"
                  value={
                    form.date_echeance_offre
                      ? new Date(form.date_echeance_offre).toLocaleDateString("fr-FR")
                      : "—"
                  }
                />
              ) : null}
              <RecapItem label="Lieu" value={form.lieu || "—"} />
              <RecapItem
                label="CA"
                value={form.ca_estime ? formatEuro(Number(form.ca_estime)) : "—"}
              />
              <RecapItem
                label="Valorisation"
                value={
                  form.valorisation_estimee
                    ? formatEuro(Number(form.valorisation_estimee))
                    : "—"
                }
              />
              <RecapItem label="Interlocuteur" value={form.interlocuteur || "—"} />
            </dl>
          </div>
        );
      default:
        return null;
    }
  }

  const wizardHeader = (
    <div className="mt-3 space-y-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Étape {currentStep + 1} / {STEPS.length} — {currentStepMeta?.label}
      </p>
    </div>
  );

  const wizardBody = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">{renderStep()}</div>
      {error ? <p className="shrink-0 px-4 text-sm text-destructive sm:px-6">{error}</p> : null}
      <div className="flex shrink-0 flex-col gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={goPrev}
          disabled={currentStep === 0 || createDossier.isPending}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Précédent
        </Button>
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={goNext}
          disabled={createDossier.isPending}
        >
          {createDossier.isPending ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Création…
            </>
          ) : currentStep === STEPS.length - 1 ? (
            "Créer le dossier"
          ) : (
            <>
              Suivant
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex h-[100dvh] max-h-[100dvh] flex-col gap-0 rounded-none p-0 [&>button]:top-3"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="shrink-0 border-b px-4 py-3 pr-12 text-left">
            <SheetTitle>Nouveau dossier CE</SheetTitle>
            {wizardHeader}
          </SheetHeader>
          {wizardBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(92dvh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Nouveau dossier CE</DialogTitle>
          {wizardHeader}
        </DialogHeader>
        {wizardBody}
      </DialogContent>
    </Dialog>
  );
}

function RecapItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
