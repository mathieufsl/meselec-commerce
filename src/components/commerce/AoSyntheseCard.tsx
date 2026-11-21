import { CalendarClock, ExternalLink, FileText, Layers, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AoDetailFormState } from "@/lib/aoDetailForm";
import { formatEuro } from "@/lib/bpuEngine";
import {
  AO_NATURE_MARCHE_LABELS,
  AO_SECTEUR_LABELS,
  type AoNatureMarche,
  type AoSecteurCode,
  type SocieteExploitation,
} from "@/lib/commerceTypes";
import { cn } from "@/lib/utils";
import { joursAvant, libelleLieu } from "@/lib/aoSynthese";

function formatDateLongue(iso: string): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Compteur({ jours }: { jours: number }) {
  const texte = jours < 0 ? "Échéance dépassée" : jours === 0 ? "Aujourd'hui" : `J-${jours}`;
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        jours < 0
          ? "bg-muted text-muted-foreground"
          : jours <= 7
            ? "bg-destructive/10 text-destructive"
            : jours <= 14
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              : "bg-primary/10 text-primary",
      )}
    >
      {texte}
    </span>
  );
}

function Fait({
  label,
  children,
  vide,
}: {
  label: string;
  children?: React.ReactNode;
  vide?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-sm font-medium", vide && "font-normal text-muted-foreground")}>
        {vide ? "Non renseigné" : children}
      </dd>
    </div>
  );
}

/** Lecture rapide de l'AO : qui, quoi, quand rendre, combien. L'édition se fait à part. */
export function AoSyntheseCard({
  form,
  societes,
  documentsCount,
  reponsesCount,
  onEdit,
  editing,
}: {
  form: AoDetailFormState;
  societes: SocieteExploitation[];
  documentsCount: number;
  reponsesCount: number;
  onEdit?: () => void;
  editing?: boolean;
}) {
  const jours = joursAvant(form.date_limite_depot);
  const montant = form.montant_estime ? Number(form.montant_estime) : null;
  const societe = societes.find((s) => s.id === form.societe_attribuee_id);
  const secteurs = form.secteurs.filter((s) => s.secteur);
  let hote: string | null = null;
  try {
    hote = form.annonce_url ? new URL(form.annonce_url).hostname.replace(/^www\./, "") : null;
  } catch {
    hote = null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold leading-snug">
            {form.donneur_ordre_libre || "Donneur d'ordre non renseigné"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {[form.lieu ? libelleLieu(form.lieu) : null, form.reference]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {form.annonce_url ? (
            <Button size="sm" variant="outline" asChild>
              <a href={form.annonce_url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Annonce{hote ? <span className="ml-1 text-muted-foreground">· {hote}</span> : null}
              </a>
            </Button>
          ) : null}
          {onEdit ? (
            <Button size="sm" variant={editing ? "secondary" : "ghost"} onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {editing ? "Fermer l'édition" : "Modifier"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-3.5 py-3">
        <CalendarClock className="h-5 w-5 shrink-0 text-primary" />
        {form.date_limite_depot ? (
          <>
            <span className="text-sm text-muted-foreground">Remise des offres</span>
            <span className="text-base font-semibold">
              {formatDateLongue(form.date_limite_depot)}
            </span>
            {jours != null ? <Compteur jours={jours} /> : null}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Date de remise non renseignée</span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Fait label="Montant estimé" vide={montant == null || Number.isNaN(montant)}>
          {montant != null ? formatEuro(montant, 0) + " HT" : null}
        </Fait>
        <Fait label="Publication" vide={!form.date_publication}>
          {formatDateLongue(form.date_publication)}
        </Fait>
        <Fait label="Société" vide={!societe}>
          {societe?.nom}
        </Fait>
        <Fait label="Dossier">
          <span className="inline-flex items-center gap-3 font-normal">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {documentsCount} doc.
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              {reponsesCount} réponse{reponsesCount > 1 ? "s" : ""}
            </span>
          </span>
        </Fait>
      </dl>

      {secteurs.length > 0 || form.marche_pluriannuel ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {secteurs.map((s) => (
            <span
              key={s.localId}
              className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {AO_SECTEUR_LABELS[s.secteur as AoSecteurCode]}
              {s.nature_marche ? (
                <span className="font-normal opacity-80">
                  {" "}
                  · {AO_NATURE_MARCHE_LABELS[s.nature_marche as AoNatureMarche]}
                </span>
              ) : null}
            </span>
          ))}
          {form.marche_pluriannuel ? (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Pluriannuel
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
