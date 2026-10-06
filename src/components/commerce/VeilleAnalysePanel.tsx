import { useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  FileText,
  FolderOpen,
  Footprints,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { VeilleAnnonceRow } from "@/lib/veille";
import {
  EXIGENCE_LABELS,
  VEILLE_ANALYSE_STATUT_LABELS,
  VISITE_LABELS,
  type VeilleDceFichier,
} from "@/lib/veilleAnalyse";
import { PLATEFORME_LABELS } from "@/lib/veilleAvis";

const VISITE_STYLES = {
  obligatoire: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  facultative: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  non_mentionnee: "bg-muted text-muted-foreground",
} as const;

function Puce({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

async function ouvrirPiece(fichier: VeilleDceFichier) {
  const { data, error } = await supabase.storage
    .from("veille-dce")
    .createSignedUrl(fichier.path, 300);
  if (error || !data) {
    toast.error("Impossible d'ouvrir le document");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}

/** Résultat de l'analyse DCE (visite, certifications) sur une annonce de veille. */
export function VeilleAnalysePanel({ annonce }: { annonce: VeilleAnnonceRow }) {
  const [ouvert, setOuvert] = useState(false);
  const analyse = annonce.analyse_dce;
  const indices = annonce.avis_indices;

  // Pas encore d'analyse IA : on montre les indices trouvés dans l'avis.
  if (!analyse) {
    const visite = indices?.visite;
    const certifs = indices?.certifications ?? [];
    return (
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {annonce.analyse_statut === "a_faire" ? (
          <Puce className="bg-muted text-muted-foreground">
            <Loader2 className="h-3 w-3" />
            {VEILLE_ANALYSE_STATUT_LABELS.a_faire}
          </Puce>
        ) : null}
        {visite?.mentionnee ? (
          <Puce
            className={
              visite.obligatoire === false ? VISITE_STYLES.facultative : VISITE_STYLES.obligatoire
            }
          >
            <Footprints className="h-3 w-3" />
            {visite.obligatoire === false
              ? "Visite facultative (avis)"
              : visite.obligatoire
                ? "Visite obligatoire (avis)"
                : "Visite mentionnée (avis)"}
          </Puce>
        ) : null}
        {certifs.map((c) => (
          <Puce key={c} className="bg-violet-500/15 text-violet-700 dark:text-violet-300">
            <BadgeCheck className="h-3 w-3" />
            {c}
          </Puce>
        ))}
        {annonce.url_dce ? <LienDce annonce={annonce} /> : null}
      </div>
    );
  }

  const fichiers = (annonce.dce_fichiers ?? []) as VeilleDceFichier[];
  return (
    <Collapsible open={ouvert} onOpenChange={setOuvert} className="mt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Puce className={VISITE_STYLES[analyse.visite.exigee]}>
          <Footprints className="h-3 w-3" />
          {VISITE_LABELS[analyse.visite.exigee]}
          {analyse.visite.dates.length ? ` · ${analyse.visite.dates.join(", ")}` : ""}
        </Puce>
        {analyse.certifications.length === 0 ? (
          <Puce className="bg-muted text-muted-foreground">Aucune certification exigée</Puce>
        ) : (
          analyse.certifications.map((c) => (
            <Puce
              key={c.nom}
              className={
                c.exigence === "obligatoire"
                  ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                  : "bg-muted text-muted-foreground"
              }
            >
              <BadgeCheck className="h-3 w-3" />
              {c.nom} {EXIGENCE_LABELS[c.exigence]}
            </Puce>
          ))
        )}
        {analyse.points_attention.length ? (
          <Puce className="bg-red-500/10 text-red-700 dark:text-red-300">
            <AlertTriangle className="h-3 w-3" />
            {analyse.points_attention.length} point(s) d&apos;attention
          </Puce>
        ) : null}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
          >
            {ouvert ? "Masquer" : "Détail"}
            <ChevronDown className={cn("h-3 w-3 transition-transform", ouvert && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
          <p className="text-[11px] text-muted-foreground">
            {VEILLE_ANALYSE_STATUT_LABELS[annonce.analyse_statut]}
            {analyse.documents_analyses?.length
              ? ` — ${analyse.documents_analyses.join(", ")}`
              : ""}
            {annonce.analyse_erreur && annonce.analyse_statut !== "termine"
              ? ` (${annonce.analyse_erreur})`
              : ""}
          </p>
          <p className="leading-relaxed text-foreground">{analyse.resume}</p>

          {analyse.visite.exigee !== "non_mentionnee" ? (
            <div>
              <p className="font-semibold">Visite</p>
              <p className="text-muted-foreground">
                {analyse.visite.modalites ?? "Modalités non précisées"}
                {analyse.visite.source ? ` — ${analyse.visite.source}` : ""}
              </p>
            </div>
          ) : null}

          {analyse.certifications.length ? (
            <div>
              <p className="font-semibold">Certifications / qualifications</p>
              <ul className="list-disc pl-4 text-muted-foreground">
                {analyse.certifications.map((c) => (
                  <li key={c.nom}>
                    <span className="text-foreground">{c.nom}</span> ({EXIGENCE_LABELS[c.exigence]})
                    {c.detail ? ` — ${c.detail}` : ""}
                    {c.source ? ` [${c.source}]` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {analyse.autres_exigences.length ? (
            <div>
              <p className="font-semibold">Autres exigences</p>
              <ul className="list-disc pl-4 text-muted-foreground">
                {analyse.autres_exigences.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {analyse.points_attention.length ? (
            <div>
              <p className="font-semibold">Points d&apos;attention</p>
              <ul className="list-disc pl-4 text-muted-foreground">
                {analyse.points_attention.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {analyse.date_limite_questions ? (
            <p className="text-muted-foreground">
              Questions jusqu&apos;au{" "}
              <span className="text-foreground">{analyse.date_limite_questions}</span>
            </p>
          ) : null}

          {fichiers.length || annonce.url_dce ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {fichiers.map((f) => (
                <Button
                  key={f.path}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => void ouvrirPiece(f)}
                >
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  {f.nom}
                </Button>
              ))}
              {annonce.url_dce ? <LienDce annonce={annonce} /> : null}
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function LienDce({ annonce }: { annonce: VeilleAnnonceRow }) {
  return (
    <a
      href={annonce.url_dce ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
    >
      <FolderOpen className="h-3 w-3" />
      DCE{annonce.plateforme ? ` (${PLATEFORME_LABELS[annonce.plateforme]})` : ""}
    </a>
  );
}
