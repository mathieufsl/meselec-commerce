import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AoIdentityCard } from "@/components/commerce/AoIdentityCard";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useAppelsOffres,
  useClients,
  useCreateAppelOffreWithSecteurs,
  useSocietes,
} from "@/hooks/useCommerceData";
import {
  emptyCreateForm,
  toCreatePayload,
  validateCreateStep,
  type AoCreateFormState,
} from "@/lib/aoCreateForm";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const STEPS = [
  { id: "identification", label: "Identification" },
  { id: "calendrier", label: "Calendrier" },
  { id: "organisation", label: "Organisation" },
  { id: "secteurs", label: "Secteurs" },
  { id: "recap", label: "Récapitulatif" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function AoCreateWizard({
  open,
  onOpenChange,
  defaultSocieteId = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSocieteId?: string;
}) {
  const navigate = useNavigate();
  const { data: societes = [] } = useSocietes();
  const { data: clients = [] } = useClients();
  const { data: aos = [] } = useAppelsOffres();
  const createAo = useCreateAppelOffreWithSecteurs();
  const isMobile = useIsMobile();

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<AoCreateFormState>(() => emptyCreateForm(defaultSocieteId));
  const [error, setError] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  const currentStepMeta = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const donneurOrdreSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const c of clients) {
      if (c.nom_entreprise?.trim()) set.add(c.nom_entreprise.trim());
    }
    for (const ao of aos) {
      if (ao.donneur_ordre_libre?.trim()) set.add(ao.donneur_ordre_libre.trim());
      if (ao.clients?.nom_entreprise?.trim()) set.add(ao.clients.nom_entreprise.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [clients, aos]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setForm(emptyCreateForm(defaultSocieteId || societes[0]?.id || ""));
      setCurrentStep(0);
      setError(null);
    }
    wasOpenRef.current = open;
  }, [open, defaultSocieteId, societes]);

  function patch(patch: Partial<AoCreateFormState>) {
    setForm((f) => ({ ...f, ...patch }));
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
      const { ao, secteurs } = toCreatePayload(form);
      const created = await createAo.mutateAsync({ ao, secteurs });
      onOpenChange(false);
      await navigate({ to: "/appels-offres/$aoId", params: { aoId: created.id } });
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
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Référence *</span>
              <Input
                value={form.reference}
                onChange={(e) => patch({ reference: e.target.value })}
                placeholder="Ex. 2026-EPINAY"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Titre *</span>
              <Input
                value={form.titre}
                onChange={(e) => patch({ titre: e.target.value })}
                placeholder="Objet du marché"
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Donneur d&apos;ordre</span>
              <Input
                list="ao-wizard-donneurs"
                value={form.donneur_ordre_libre}
                onChange={(e) => patch({ donneur_ordre_libre: e.target.value })}
                placeholder="Saisie libre"
              />
              <datalist id="ao-wizard-donneurs">
                {donneurOrdreSuggestions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Lieu</span>
              <Input
                value={form.lieu}
                onChange={(e) => patch({ lieu: e.target.value })}
                placeholder="Ville, site…"
              />
            </label>
          </div>
        );
      case "calendrier":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Date de publication</span>
              <Input
                type="date"
                value={form.date_publication}
                onChange={(e) => patch({ date_publication: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Date limite de dépôt</span>
              <Input
                type="date"
                value={form.date_limite_depot}
                onChange={(e) => patch({ date_limite_depot: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.marche_pluriannuel}
                onCheckedChange={(v) => patch({ marche_pluriannuel: Boolean(v) })}
              />
              <span>Marché sur plusieurs années</span>
            </label>
          </div>
        );
      case "organisation":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Société d&apos;exploitation *</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.societe_attribuee_id}
                onChange={(e) => patch({ societe_attribuee_id: e.target.value })}
              >
                <option value="">Choisir</option>
                {societes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom} ({s.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Montant estimé (€ HT)</span>
              <Input
                type="number"
                value={form.montant_estime}
                onChange={(e) => patch({ montant_estime: e.target.value })}
              />
            </label>
          </div>
        );
      case "secteurs":
        return (
          <AoIdentityCard
            form={form}
            onChange={patch}
            societes={societes}
            mode="create"
            showFields="secteurs"
            compact
          />
        );
      case "recap":
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vérifiez la fiche d&apos;identité de votre appel d&apos;offres. Vous pourrez la modifier
              ensuite depuis le détail.
            </p>
            <AoIdentityCard
              form={form}
              onChange={patch}
              societes={societes}
              donneurOrdreSuggestions={donneurOrdreSuggestions}
              mode="create"
            />
          </div>
        );
      default:
        return null;
    }
  }

  const wizardHeader = (
    <>
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
    </>
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
          disabled={currentStep === 0 || createAo.isPending}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Précédent
        </Button>
        <Button type="button" className="w-full sm:w-auto" onClick={goNext} disabled={createAo.isPending}>
          {createAo.isPending ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Création…
            </>
          ) : currentStep === STEPS.length - 1 ? (
            "Créer l'appel d'offres"
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
            <SheetTitle>Créer un appel d&apos;offres</SheetTitle>
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
          <DialogTitle>Créer un appel d&apos;offres</DialogTitle>
          {wizardHeader}
        </DialogHeader>
        {wizardBody}
      </DialogContent>
    </Dialog>
  );
}
