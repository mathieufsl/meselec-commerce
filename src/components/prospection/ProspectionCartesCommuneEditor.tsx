import { useEffect, useMemo, useState } from "react";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import {
  canonicalizePrestataire,
  suggestPrestataires,
} from "@/lib/prospection/prestataireNomenclature";
import { hasReferenceSeed } from "@/lib/prospection/referenceState";
import { GESTION_OPTIONS, STATUS_OPTIONS, statusLabel } from "@/lib/prospection/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";

type Props = {
  commune: ProspectionCommune;
  state: ProspectionCommuneState;
  onSave: (patch: Partial<ProspectionCommuneState>) => Promise<void>;
  onClose?: () => void;
  className?: string;
};

export function ProspectionCartesCommuneEditor({
  commune,
  state,
  onSave,
  onClose,
  className,
}: Props) {
  const [prestataire, setPrestataire] = useState(state.prestataire);
  const [gestion, setGestion] = useState(state.gestion);
  const [status, setStatus] = useState(state.status);
  const [contact, setContact] = useState(state.contact);
  const [notes, setNotes] = useState(state.notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrestataire(state.prestataire);
    setGestion(state.gestion);
    setStatus(state.status);
    setContact(state.contact);
    setNotes(state.notes);
    setError(null);
  }, [commune.key, state]);

  const suggestions = useMemo(
    () => (prestataire.trim() ? suggestPrestataires(prestataire, 8) : []),
    [prestataire],
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        prestataire: canonicalizePrestataire(prestataire),
        gestion,
        status,
        contact: contact.trim(),
        notes: notes.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    canonicalizePrestataire(prestataire) !== canonicalizePrestataire(state.prestataire) ||
    gestion !== state.gestion ||
    status !== state.status ||
    contact.trim() !== state.contact ||
    notes.trim() !== state.notes;

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold leading-tight">{commune.ville}</h3>
          <p className="text-xs text-muted-foreground">{commune.departement}</p>
          <p className="text-xs text-muted-foreground">
            {commune.habitants.toLocaleString("fr-FR")} hab. · {commune.agglo}
          </p>
          {hasReferenceSeed(commune.key) ? (
            <Badge variant="secondary" className="mt-1.5 text-[10px]">
              Données CSV complétées
            </Badge>
          ) : null}
        </div>
        {onClose ? (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </Button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="space-y-2">
          <Label htmlFor={`carte-prestataire-${commune.key}`}>Prestataire EP</Label>
          <Input
            id={`carte-prestataire-${commune.key}`}
            list={`carte-prestataire-options-${commune.key}`}
            value={prestataire}
            onChange={(e) => setPrestataire(e.target.value)}
            placeholder="ex. Citeos, EES…"
            autoComplete="off"
          />
          <datalist id={`carte-prestataire-options-${commune.key}`}>
            {suggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 6).map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs hover:bg-muted"
                  onClick={() => setPrestataire(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Qui gère EP</Label>
            <Select
              value={gestion || "__none__"}
              onValueChange={(v) =>
                setGestion((v === "__none__" ? "" : v) as ProspectionCommuneState["gestion"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GESTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "__none__"} value={o.value || "__none__"}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ProspectionCommuneState["status"])}
            >
              <SelectTrigger>
                <SelectValue>{statusLabel(status)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`carte-contact-${commune.key}`}>Contact</Label>
          <Input
            id={`carte-contact-${commune.key}`}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Tél, email…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`carte-notes-${commune.key}`}>Notes</Label>
          <Textarea
            id={`carte-notes-${commune.key}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes…"
            rows={4}
            className="min-h-[96px] resize-y"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="border-t border-border/60 p-4">
        <Button
          type="button"
          className="w-full"
          disabled={!dirty || saving}
          onClick={() => void handleSave()}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
