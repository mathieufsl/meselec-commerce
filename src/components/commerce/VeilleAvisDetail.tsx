import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResumerAvis, useVeilleAvisComplet } from "@/hooks/useVeille";
import { useSecondes } from "@/hooks/useSecondes";
import { cn } from "@/lib/utils";

/**
 * Détail de l'avis (objet, lots, critères, conditions…), rédigé par l'IA au clic
 * seulement, affiché sous la qualification dont il complète le verdict.
 * Le « en bref » du résumé n'est pas repris : la qualification le dit déjà.
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
  // Le panneau garde ce composant d'une annonce à l'autre : on n'affiche l'état
  // (chargement, erreur) que s'il concerne l'annonce affichée.
  const pourCetteAnnonce = resumer.variables?.id === id;
  const enCours = resumer.isPending && pourCetteAnnonce;
  const secondes = useSecondes(enCours);

  function lancer(force = false) {
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

  if (enCours && !resume) {
    return (
      <div className="flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
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
    );
  }

  if (resume) {
    return (
      <div className="space-y-3 border-t pt-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Détail de l&apos;avis
          </p>
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
        </div>
        {resume.sections.map((s) => (
          <div key={s.titre}>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">{s.titre}</p>
            <ul className="list-disc space-y-0.5 pl-5 leading-relaxed [overflow-wrap:anywhere]">
              {s.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs text-destructive">{erreur}</p>
        <Button size="sm" variant="outline" onClick={() => lancer()}>
          Réessayer
        </Button>
      </div>
    );
  }

  // Texte de l'avis absent (annonce ajoutée à la main…) : rien à détailler.
  if (isLoading || !data?.raw) return null;

  return (
    <div className="border-t pt-3">
      <Button size="sm" variant="outline" onClick={() => lancer()}>
        <Sparkles className="mr-1.5 h-4 w-4" /> Détailler l&apos;avis (lots, critères, conditions)
      </Button>
    </div>
  );
}
