import { useEffect, useState } from "react";
import type { CrmCommune } from "@/data/crmCommunes";
import type { CrmCommuneState } from "@/lib/prospection/crmApi";
import { aggloBadgeClass } from "@/lib/prospection/ui";
import {
  CRM_CIBLE_COMMERCIAUX,
  type CrmCibleCommercial,
  departementShortLabel,
  normalizeQuiCible,
  nuanceBadgeClass,
  quiCibleSelectClass,
} from "@/lib/prospection/crmUi";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Mail, Phone } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commune: CrmCommune | null;
  row: CrmCommuneState;
  isDirty: boolean;
  onPatch: (key: string, patch: Partial<CrmCommuneState>) => void;
};

export function ProspectionCrmCommuneDetailSheet({
  open,
  onOpenChange,
  commune,
  row,
  isDirty,
  onPatch,
}: Props) {
  const isMobile = useIsMobile();
  const [quiCible, setQuiCible] = useState(normalizeQuiCible(row.quiCible));
  const [prestataire, setPrestataire] = useState(row.prestataire);
  const [dureeMarche, setDureeMarche] = useState(row.dureeMarche);
  const [dateAttribution, setDateAttribution] = useState(row.dateAttribution);
  const [dateExpiration, setDateExpiration] = useState(row.dateExpiration);
  const [dateRecandidature, setDateRecandidature] = useState(row.dateRecandidature);
  const [agendaSuivi, setAgendaSuivi] = useState(row.agendaSuivi);
  const [notes, setNotes] = useState(row.notes);

  useEffect(() => {
    setQuiCible(normalizeQuiCible(row.quiCible));
    setPrestataire(row.prestataire);
    setDureeMarche(row.dureeMarche);
    setDateAttribution(row.dateAttribution);
    setDateExpiration(row.dateExpiration);
    setDateRecandidature(row.dateRecandidature);
    setAgendaSuivi(row.agendaSuivi);
    setNotes(row.notes);
  }, [
    row.quiCible,
    row.prestataire,
    row.dureeMarche,
    row.dateAttribution,
    row.dateExpiration,
    row.dateRecandidature,
    row.agendaSuivi,
    row.notes,
    commune?.key,
  ]);

  if (!commune) return null;

  const commitFields = () => {
    const patch: Partial<CrmCommuneState> = {};
    if (quiCible !== row.quiCible) patch.quiCible = quiCible;
    if (prestataire !== row.prestataire) patch.prestataire = prestataire;
    if (dureeMarche !== row.dureeMarche) patch.dureeMarche = dureeMarche;
    if (dateAttribution !== row.dateAttribution) patch.dateAttribution = dateAttribution;
    if (dateExpiration !== row.dateExpiration) patch.dateExpiration = dateExpiration;
    if (dateRecandidature !== row.dateRecandidature) patch.dateRecandidature = dateRecandidature;
    if (agendaSuivi !== row.agendaSuivi) patch.agendaSuivi = agendaSuivi;
    if (notes !== row.notes) patch.notes = notes;
    if (Object.keys(patch).length > 0) onPatch(commune.key, patch);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex w-full flex-col gap-0 overflow-hidden p-0",
          isMobile ? "h-[92dvh] max-h-[92dvh] rounded-t-2xl" : "sm:max-w-md",
        )}
      >
        <SheetHeader className="shrink-0 border-b px-4 py-4 text-left">
          <SheetTitle className="text-base leading-tight">{commune.ville}</SheetTitle>
          <SheetDescription>
            {commune.departement} · {commune.habitants.toLocaleString("fr")} habitants
            {isDirty ? " · modifications non enregistrées" : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Agglomération</Label>
            <span
              className={cn(
                "inline-block max-w-full rounded-md px-2.5 py-1 text-xs font-semibold",
                aggloBadgeClass(commune.agglo),
              )}
            >
              {commune.agglo || "N/A"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Département</Label>
              <p className="text-sm font-medium">{departementShortLabel(commune.departement)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Nuance</Label>
              {commune.nuance ? (
                <span
                  className={cn(
                    "mt-0.5 inline-block rounded-md px-2 py-0.5 text-xs font-semibold",
                    nuanceBadgeClass(commune.nuance),
                  )}
                >
                  {commune.nuance}
                </span>
              ) : (
                <p className="text-sm">—</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Maire</Label>
            <p className="text-sm font-medium leading-snug">{commune.maire}</p>
          </div>

          {commune.telephone ? (
            <div>
              <Label className="text-xs text-muted-foreground">Standard mairie</Label>
              <a
                href={`tel:${commune.telephone.replace(/\s/g, "")}`}
                className="mt-1 flex items-center gap-2 text-sm font-medium text-primary"
              >
                <Phone className="h-4 w-4" />
                {commune.telephone}
              </a>
            </div>
          ) : null}

          {commune.email ? (
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <a
                href={`mailto:${commune.email}`}
                className="mt-1 flex items-center gap-2 break-all text-sm font-medium text-primary"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {commune.email}
              </a>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="crm-qui-cible">Qui cible ?</Label>
            <Select
              value={quiCible || "__none__"}
              onValueChange={(v) => {
                const next = v === "__none__" ? "" : (v as CrmCibleCommercial);
                setQuiCible(next);
                onPatch(commune.key, { quiCible: next });
              }}
            >
              <SelectTrigger
                id="crm-qui-cible"
                className={cn("w-full", quiCibleSelectClass(quiCible))}
              >
                <SelectValue placeholder="Choisir un commercial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Non assigné</SelectItem>
                {CRM_CIBLE_COMMERCIAUX.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crm-prestataire">Prestataire</Label>
            <Input
              id="crm-prestataire"
              value={prestataire}
              onChange={(e) => setPrestataire(e.target.value)}
              onBlur={commitFields}
              placeholder="Prestataire actuel"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crm-duree-marche">Durée du marché</Label>
            <Input
              id="crm-duree-marche"
              value={dureeMarche}
              onChange={(e) => setDureeMarche(e.target.value)}
              onBlur={commitFields}
              placeholder="Ex: 36 mois"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="crm-date-attribution">Date d&apos;attribution</Label>
              <Input
                id="crm-date-attribution"
                type="date"
                value={dateAttribution}
                onChange={(e) => setDateAttribution(e.target.value)}
                onBlur={commitFields}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crm-date-expiration">Date d&apos;expiration</Label>
              <Input
                id="crm-date-expiration"
                type="date"
                value={dateExpiration}
                onChange={(e) => setDateExpiration(e.target.value)}
                onBlur={commitFields}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crm-date-recandidature">Prochaine recandidature</Label>
            <Input
              id="crm-date-recandidature"
              type="date"
              value={dateRecandidature}
              onChange={(e) => setDateRecandidature(e.target.value)}
              onBlur={commitFields}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crm-agenda-suivi">Agenda de suivi</Label>
            <Textarea
              id="crm-agenda-suivi"
              value={agendaSuivi}
              onChange={(e) => setAgendaSuivi(e.target.value)}
              onBlur={commitFields}
              placeholder="Date d'action, relance, pièces à préparer…"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crm-notes">Notes internes</Label>
            <Textarea
              id="crm-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={commitFields}
              placeholder="Notes de prospection…"
              rows={4}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
