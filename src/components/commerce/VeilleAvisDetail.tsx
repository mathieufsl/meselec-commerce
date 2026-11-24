import { useState } from "react";
import { ChevronDown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResumerAvis, useVeilleAvisComplet } from "@/hooks/useVeille";
import { useSecondes } from "@/hooks/useSecondes";
import type { AvisResumeSection } from "@/lib/veilleResume";
import { cn } from "@/lib/utils";

function Section({ s }: { s: AvisResumeSection }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{s.titre}</p>
      <ul className="list-disc space-y-0.5 pl-5 leading-relaxed [overflow-wrap:anywhere]">
        {s.points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Détail de l'avis, sous le verdict de la qualification.
 * Par défaut : l'objet des prestations seulement. Le détail complet (forme du marché,
 * dates, critères, conditions) ne s'affiche qu'au clic sur « Analyser l'avis » ;
 * s'il n'a jamais été rédigé, ce clic lance l'IA (une fois, puis il est enregistré).
 */
export function VeilleAvisDetail({
  id,
  onDebut,
  onFin,
}: {
  id: string;
  onDebut?: () => void;
  onFin?: (ok: boolean) => void;
}) {
  const { data, isLoading } = useVeilleAvisComplet(id);
  const resumer = useResumerAvis();
  const resume = data?.avis_resume ?? null;
  const [ouvert, setOuvert] = useState(false);
  // Le panneau garde ce composant d'une annonce à l'autre : on n'affiche l'état
  // (chargement, erreur) que s'il concerne l'annonce affichée.
  const pourCetteAnnonce = resumer.variables?.id === id;
  const enCours = resumer.isPending && pourCetteAnnonce;
  const secondes = useSecondes(enCours);

  function lancer(force = false) {
    setOuvert(true);
    onDebut?.();
    resumer.mutate(
      { id, force },
      {
        onSuccess: (res) => onFin?.(res.ok),
        onError: () => onFin?.(false),
      },
    );
  }

  const erreur = !pourCetteAnnonce
    ? null
    : resumer.data && !resumer.data.ok
      ? resumer.data.error
      : resumer.error instanceof Error
        ? resumer.error.message
        : null;

  // Objet des prestations : la section dédiée du résumé IA s'il existe, sinon l'objet brut de l'avis.
  const iObjet = resume ? resume.sections.findIndex((s) => /objet|prestation/i.test(s.titre)) : -1;
  const sectionObjet = resume ? (resume.sections[iObjet >= 0 ? iObjet : 0] ?? null) : null;
  const autres = resume ? resume.sections.filter((s) => s !== sectionObjet) : [];
  const objetBrut = typeof data?.raw?.["objet"] === "string" ? (data.raw["objet"] as string) : null;

  if (isLoading) return null;
  if (!resume && !data?.raw) return null; // annonce sans texte d'avis : rien à détailler

  return (
    <div className="space-y-3 border-t pt-3 text-sm">
      {sectionObjet ? (
        <Section s={{ ...sectionObjet, titre: "Objet et prestations" }} />
      ) : objetBrut ? (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Objet et prestations</p>
          <p className="leading-relaxed [overflow-wrap:anywhere]">{objetBrut}</p>
        </div>
      ) : null}

      {ouvert && resume ? autres.map((s) => <Section key={s.titre} s={s} />) : null}

      {enCours && !resume ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            Claude lit l&apos;avis… <span className="tabular-nums">{secondes} s</span>
            {secondes >= 20 ? (
              <span className="block text-xs">
                Ça prend d&apos;habitude 10 à 30 s. Au-delà de 90 s, l&apos;erreur s&apos;affichera
                ici.
              </span>
            ) : null}
          </span>
        </div>
      ) : erreur ? (
        <div className="space-y-2">
          <p className="text-xs text-destructive">{erreur}</p>
          <Button size="sm" variant="outline" onClick={() => lancer()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {!ouvert || !resume ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => (resume ? setOuvert(true) : lancer())}
            >
              <Sparkles className="mr-1.5 h-4 w-4" /> Analyser l&apos;avis (forme, dates, critères,
              conditions)
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => setOuvert(false)}
              >
                <ChevronDown className="mr-1 h-3 w-3 rotate-180" />
                Réduire
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                disabled={enCours}
                onClick={() => lancer(true)}
              >
                <RefreshCw className={cn("mr-1 h-3 w-3", enCours && "animate-spin")} />
                Régénérer
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
