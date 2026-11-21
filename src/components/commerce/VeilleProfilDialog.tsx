import { useEffect, useState } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQualificationProfils, useUpdateQualificationProfil } from "@/hooks/useVeille";
import type { QualificationProfil } from "@/lib/veilleQualif";

const LISTES: Array<{ key: keyof QualificationProfil; label: string; hint: string }> = [
  { key: "metiers", label: "Métiers", hint: "Un métier par ligne" },
  { key: "hors_perimetre", label: "Hors périmètre", hint: "Une exclusion par ligne" },
  { key: "departements", label: "Départements", hint: "Un code par ligne (ex. 75)" },
  { key: "certifications_detenues", label: "Certifications détenues", hint: "Une par ligne" },
  { key: "certifications_manquantes", label: "Certifications manquantes", hint: "Une par ligne" },
];

function versLignes(v: string[]): string {
  return v.join("\n");
}
function depuisLignes(v: string): string[] {
  return v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
function nombreOuNull(v: string): number | null {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return v.trim() && Number.isFinite(n) ? n : null;
}

function ProfilForm({ profil }: { profil: QualificationProfil }) {
  const [draft, setDraft] = useState(profil);
  const update = useUpdateQualificationProfil();
  useEffect(() => setDraft(profil), [profil]);

  function enregistrer() {
    update.mutate(draft, {
      onSuccess: () => toast.success(`Profil ${draft.entite} enregistré`),
      onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Échec"),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch
          checked={draft.actif}
          onCheckedChange={(actif) => setDraft({ ...draft, actif })}
          id={`actif-${draft.entite}`}
        />
        <Label htmlFor={`actif-${draft.entite}`}>Profil actif</Label>
      </div>
      {LISTES.map(({ key, label, hint }) => (
        <div key={key} className="space-y-1">
          <Label>{label}</Label>
          <Textarea
            rows={key === "metiers" || key === "hors_perimetre" ? 5 : 2}
            placeholder={hint}
            value={versLignes(draft[key] as string[])}
            onChange={(e) => setDraft({ ...draft, [key]: depuisLignes(e.target.value) })}
          />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Montant min (€ HT)</Label>
          <Input
            inputMode="numeric"
            defaultValue={draft.montant_min ?? ""}
            onChange={(e) => setDraft({ ...draft, montant_min: nombreOuNull(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label>Montant max (€ HT)</Label>
          <Input
            inputMode="numeric"
            defaultValue={draft.montant_max ?? ""}
            onChange={(e) => setDraft({ ...draft, montant_max: nombreOuNull(e.target.value) })}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Règles (consignes injectées dans le prompt)</Label>
        <Textarea
          rows={8}
          value={draft.regles}
          onChange={(e) => setDraft({ ...draft, regles: e.target.value })}
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={enregistrer} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

export function VeilleProfilDialog({
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: { open?: boolean; onOpenChange?: (open: boolean) => void; hideTrigger?: boolean } = {}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
  const { data: profils = [], isLoading } = useQualificationProfils();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Profil de qualification
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Profil de qualification</DialogTitle>
          <DialogDescription>
            Ce que l'IA sait de chaque entité pour trier les annonces. Les changements s'appliquent
            aux prochaines qualifications.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : profils.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun profil.</p>
        ) : (
          <Tabs defaultValue={profils[0]?.entite ?? "MESELEC"}>
            <TabsList>
              {profils.map((p) => (
                <TabsTrigger key={p.entite} value={p.entite}>
                  {p.entite}
                </TabsTrigger>
              ))}
            </TabsList>
            {profils.map((p) => (
              <TabsContent key={p.entite} value={p.entite} className="pt-2">
                <ProfilForm profil={p} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
