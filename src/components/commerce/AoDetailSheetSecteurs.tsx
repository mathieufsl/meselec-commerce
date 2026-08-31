import {
  ReminderRow,
  ReminderSelect,
  ReminderSheetSection,
} from "@/components/commerce/ReminderBlocks";
import { Checkbox } from "@/components/ui/checkbox";
import { type AoSecteurDraft } from "@/lib/aoCreateForm";
import {
  AO_NATURE_MARCHE_LABELS,
  AO_PRESTATION_LABELS,
  AO_SECTEUR_LABELS,
  AO_SECTEURS,
  type AoNatureMarche,
  type AoPrestation,
  type AoSecteurCode,
} from "@/lib/commerceTypes";
import { cn } from "@/lib/utils";
import { Layers, Plus, Tag, Wrench } from "lucide-react";

type SecteurRow =
  | { kind: "secteur"; localId: string }
  | { kind: "nature"; localId: string }
  | { kind: "prestation"; localId: string; prestation: AoPrestation };

function buildSecteurRows(secteurs: AoSecteurDraft[]): SecteurRow[] {
  const rows: SecteurRow[] = [];
  for (const s of secteurs) {
    rows.push({ kind: "secteur", localId: s.localId });
    rows.push({ kind: "nature", localId: s.localId });
    if (s.nature_marche === "travaux_neuf") {
      for (const p of Object.keys(AO_PRESTATION_LABELS) as AoPrestation[]) {
        rows.push({ kind: "prestation", localId: s.localId, prestation: p });
      }
    }
  }
  return rows;
}

export function AoDetailSheetSecteurs({
  secteurs,
  usedSecteurs,
  onUpdate,
  onTogglePrestation,
  onAdd,
  canAdd,
}: {
  secteurs: AoSecteurDraft[];
  usedSecteurs: AoSecteurCode[];
  onUpdate: (localId: string, patch: Partial<AoSecteurDraft>) => void;
  onTogglePrestation: (localId: string, prestation: AoPrestation) => void;
  onAdd: () => void;
  canAdd: boolean;
}) {
  const flatRows = buildSecteurRows(secteurs);
  const secteurById = new Map(secteurs.map((s) => [s.localId, s]));

  return (
    <ReminderSheetSection title="Secteurs">
      {secteurs.length === 0 ? (
        <p className="px-4 py-5 text-center text-sm text-muted-foreground">Aucun secteur.</p>
      ) : (
        flatRows.map((row, index) => {
          const s = secteurById.get(row.localId);
          if (!s) return null;
          const isLast = index === flatRows.length - 1;
          const showDivider =
            row.kind === "secteur" && index > 0 && flatRows[index - 1]?.kind !== "secteur";

          if (row.kind === "secteur") {
            return (
              <div key={`${row.localId}-secteur`} className={cn(showDivider && "border-t border-border/50")}>
                <ReminderRow icon={Layers} label="Secteur" last={isLast}>
                  <ReminderSelect
                    value={s.secteur}
                    onChange={(e) =>
                      onUpdate(row.localId, {
                        secteur: e.target.value as AoSecteurCode | "",
                        nature_marche: "",
                        prestations: [],
                        bail_duree_mois: "",
                        bail_date_debut: "",
                        bail_date_fin: "",
                      })
                    }
                  >
                    <option value=""></option>
                    {AO_SECTEURS.map((code) => (
                      <option
                        key={code}
                        value={code}
                        disabled={usedSecteurs.includes(code) && s.secteur !== code}
                      >
                        {AO_SECTEUR_LABELS[code]}
                      </option>
                    ))}
                  </ReminderSelect>
                </ReminderRow>
              </div>
            );
          }

          if (row.kind === "nature") {
            return (
              <ReminderRow key={`${row.localId}-nature`} icon={Wrench} label="Nature" last={isLast}>
                <ReminderSelect
                  value={s.nature_marche}
                  onChange={(e) =>
                    onUpdate(row.localId, {
                      nature_marche: e.target.value as AoNatureMarche | "",
                      prestations: [],
                      bail_duree_mois: "",
                      bail_date_debut: "",
                      bail_date_fin: "",
                    })
                  }
                  disabled={!s.secteur}
                >
                  <option value=""></option>
                  {(Object.keys(AO_NATURE_MARCHE_LABELS) as AoNatureMarche[]).map((n) => (
                    <option key={n} value={n}>
                      {AO_NATURE_MARCHE_LABELS[n]}
                    </option>
                  ))}
                </ReminderSelect>
              </ReminderRow>
            );
          }

          return (
            <ReminderRow
              key={`${row.localId}-${row.prestation}`}
              icon={Tag}
              label={AO_PRESTATION_LABELS[row.prestation]}
              last={isLast}
            >
              <Checkbox
                checked={s.prestations.includes(row.prestation)}
                onCheckedChange={() => onTogglePrestation(row.localId, row.prestation)}
              />
            </ReminderRow>
          );
        })
      )}
      {canAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border/50 py-3 text-sm font-medium text-primary transition-colors hover:bg-muted/30"
        >
          <Plus className="h-4 w-4" />
          Ajouter un secteur
        </button>
      ) : null}
    </ReminderSheetSection>
  );
}
