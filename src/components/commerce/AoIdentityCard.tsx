import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { AoCreateFormState, AoSecteurDraft } from "@/lib/aoCreateForm";
import { emptySecteurDraft, patchBailSecteurFields } from "@/lib/aoCreateForm";
import type { AoDetailFormState } from "@/lib/aoDetailForm";
import {
  AO_NATURE_MARCHE_LABELS,
  AO_PRESTATION_LABELS,
  AO_SECTEUR_LABELS,
  AO_SECTEURS,
  AO_STATUT_LABELS,
  AO_STATUTS,
  type AoNatureMarche,
  type AoPrestation,
  type AoSecteurCode,
  type AoStatut,
  type SocieteExploitation,
} from "@/lib/commerceTypes";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type FormState = AoCreateFormState | AoDetailFormState;

function updateSecteur(
  secteurs: AoSecteurDraft[],
  localId: string,
  patch: Partial<AoSecteurDraft>,
): AoSecteurDraft[] {
  return secteurs.map((s) => (s.localId === localId ? { ...s, ...patch } : s));
}

function togglePrestation(list: AoPrestation[], p: AoPrestation): AoPrestation[] {
  return list.includes(p) ? list.filter((x) => x !== p) : [...list, p];
}

function SecteurEditor({
  secteur,
  usedSecteurs,
  onChange,
  onRemove,
  canRemove,
}: {
  secteur: AoSecteurDraft;
  usedSecteurs: AoSecteurCode[];
  onChange: (patch: Partial<AoSecteurDraft>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Secteur</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={secteur.secteur}
              onChange={(e) =>
                onChange({
                  secteur: e.target.value as AoSecteurCode | "",
                  nature_marche: "",
                  prestations: [],
                  bail_duree_mois: "",
                  bail_date_debut: "",
                  bail_date_fin: "",
                })
              }
            >
              <option value="">Choisir</option>
              {AO_SECTEURS.map((code) => (
                <option
                  key={code}
                  value={code}
                  disabled={usedSecteurs.includes(code) && secteur.secteur !== code}
                >
                  {AO_SECTEUR_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Nature du marché</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={secteur.nature_marche}
              onChange={(e) =>
                onChange({
                  nature_marche: e.target.value as AoNatureMarche | "",
                  prestations: [],
                  bail_duree_mois: "",
                  bail_date_debut: "",
                  bail_date_fin: "",
                })
              }
              disabled={!secteur.secteur}
            >
              <option value="">Choisir</option>
              {(Object.keys(AO_NATURE_MARCHE_LABELS) as AoNatureMarche[]).map((n) => (
                <option key={n} value={n}>
                  {AO_NATURE_MARCHE_LABELS[n]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {canRemove ? (
          <Button type="button" size="icon" variant="ghost" className="shrink-0" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {secteur.nature_marche === "travaux_neuf" ? (
        <div className="flex flex-wrap gap-3">
          {(Object.keys(AO_PRESTATION_LABELS) as AoPrestation[]).map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={secteur.prestations.includes(p)}
                onCheckedChange={() =>
                  onChange({ prestations: togglePrestation(secteur.prestations, p) })
                }
              />
              {AO_PRESTATION_LABELS[p]}
            </label>
          ))}
        </div>
      ) : null}

      {secteur.nature_marche === "bail" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Durée (mois)</span>
            <Input
              type="number"
              min={1}
              value={secteur.bail_duree_mois}
              onChange={(e) =>
                onChange(patchBailSecteurFields(secteur, { bail_duree_mois: e.target.value }))
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Entrée en vigueur</span>
            <Input
              type="date"
              value={secteur.bail_date_debut}
              onChange={(e) =>
                onChange(patchBailSecteurFields(secteur, { bail_date_debut: e.target.value }))
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Expiration</span>
            <Input
              type="date"
              value={secteur.bail_date_fin}
              onChange={(e) => onChange({ bail_date_fin: e.target.value })}
              title="Suggérée automatiquement à partir de la durée et de l'entrée en vigueur"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

export function AoIdentityCard({
  form,
  onChange,
  societes,
  donneurOrdreSuggestions = [],
  mode = "create",
  compact = false,
  showFields = "all",
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
  societes: SocieteExploitation[];
  donneurOrdreSuggestions?: string[];
  mode?: "create" | "detail";
  compact?: boolean;
  showFields?: "all" | "secteurs";
}) {
  const usedSecteurs = form.secteurs
    .map((s) => s.secteur)
    .filter(Boolean) as AoSecteurCode[];

  const addSecteur = () => {
    if (usedSecteurs.length >= AO_SECTEURS.length) return;
    onChange({ secteurs: [...form.secteurs, emptySecteurDraft()] });
  };

  const updateSecteurs = (secteurs: AoSecteurDraft[]) => onChange({ secteurs });

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {showFields === "all" ? (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Référence</span>
          <Input
            value={form.reference}
            onChange={(e) => onChange({ reference: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-sm md:col-span-1 xl:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Titre</span>
          <Input value={form.titre} onChange={(e) => onChange({ titre: e.target.value })} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Donneur d&apos;ordre</span>
          <Input
            list="ao-donneurs-ordre"
            value={form.donneur_ordre_libre}
            onChange={(e) => onChange({ donneur_ordre_libre: e.target.value })}
            placeholder="Saisie libre"
          />
          <datalist id="ao-donneurs-ordre">
            {donneurOrdreSuggestions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Lieu</span>
          <Input value={form.lieu} onChange={(e) => onChange({ lieu: e.target.value })} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Date publication</span>
          <Input
            type="date"
            value={form.date_publication}
            onChange={(e) => onChange({ date_publication: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Échéance dépôt</span>
          <Input
            type="date"
            value={form.date_limite_depot}
            onChange={(e) => onChange({ date_limite_depot: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Montant estimé (€ HT)</span>
          <Input
            type="number"
            value={form.montant_estime}
            onChange={(e) => onChange({ montant_estime: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Société d&apos;exploitation</span>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={form.societe_attribuee_id}
            onChange={(e) => onChange({ societe_attribuee_id: e.target.value })}
          >
            <option value=""></option>
            {societes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom} ({s.code})
              </option>
            ))}
          </select>
        </label>
        {mode === "detail" && "statut" in form ? (
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Statut</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={form.statut}
              onChange={(e) => onChange({ statut: e.target.value as AoStatut })}
            >
              {AO_STATUTS.map((s) => (
                <option key={s} value={s}>
                  {AO_STATUT_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <Checkbox
            checked={form.marche_pluriannuel}
            onCheckedChange={(v) => onChange({ marche_pluriannuel: Boolean(v) })}
          />
          <span>Marché sur plusieurs années</span>
        </label>
      </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Secteurs</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={addSecteur}
            disabled={usedSecteurs.length >= AO_SECTEURS.length}
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un secteur
          </Button>
        </div>
        <div className="space-y-2">
          {form.secteurs.map((s) => (
            <SecteurEditor
              key={s.localId}
              secteur={s}
              usedSecteurs={usedSecteurs}
              canRemove={form.secteurs.length > 1}
              onChange={(patch) =>
                updateSecteurs(updateSecteur(form.secteurs, s.localId, patch))
              }
              onRemove={() =>
                updateSecteurs(form.secteurs.filter((x) => x.localId !== s.localId))
              }
            />
          ))}
        </div>
      </div>

      {mode === "detail" && "notes" in form && showFields === "all" ? (
        <label className="block space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Notes internes</span>
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </label>
      ) : null}
    </div>
  );
}
