import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Radar, ScanSearch, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VeilleAnalysePanel } from "@/components/commerce/VeilleAnalysePanel";
import { VeilleAvisDetail } from "@/components/commerce/VeilleAvisDetail";
import { VeilleDepotDce } from "@/components/commerce/VeilleDepotDce";
import { useDemanderAnalyseDce } from "@/hooks/useVeille";
import { cn } from "@/lib/utils";
import { VEILLE_ANNONCE_COLONNES, type VeilleAnnonceRow } from "@/lib/veille";
import { MAX_PUCES_QUALIF, VEILLE_DECISION_LABELS } from "@/lib/veilleQualif";

type AnnonceVeille = VeilleAnnonceRow;

const DECISION_STYLES = {
  prioritaire: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  a_creuser: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  hors_sujet: "bg-muted text-muted-foreground",
} as const;

function Liste({ titre, items }: { titre: string; items: string[] | undefined }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titre}
      </p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {items.slice(0, MAX_PUCES_QUALIF).map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Tout ce que la veille sait de l'AO (qualification IA, analyse du DCE et ses
 * pièces, détail de l'avis au clic), lu en direct sur l'annonce liée : une analyse qui
 * se termine après l'envoi vers les AO apparaît ici aussi.
 */
export function AoVeilleAnalyse({ aoId, canEdit }: { aoId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const demanderDce = useDemanderAnalyseDce();
  const analyser = (a: VeilleAnnonceRow) =>
    demanderDce.mutate(a.id, {
      onSuccess: (res) => {
        void qc.invalidateQueries({ queryKey: ["ao-veille", aoId] });
        toast.success(
          res.lance
            ? "Analyse du DCE lancée : résultat dans quelques minutes"
            : "Analyse demandée : elle sera faite au prochain passage du robot",
        );
      },
      onError: (e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Impossible de lancer l'analyse"),
    });
  const { data: annonce, isLoading } = useQuery({
    queryKey: ["ao-veille", aoId],
    queryFn: async (): Promise<AnnonceVeille | null> => {
      const { data, error } = await supabase
        .from("veille_annonces")
        .select(VEILLE_ANNONCE_COLONNES)
        .eq("ao_id", aoId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AnnonceVeille | null) ?? null;
    },
    // Suit le robot DCE tant qu'il travaille sur l'annonce.
    refetchInterval: (q) => (q.state.data?.analyse_statut === "a_faire" ? 10_000 : false),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!annonce) {
    return (
      <p className="text-sm text-muted-foreground">
        Cet appel d&apos;offres n&apos;a pas été créé depuis la veille : pas d&apos;analyse
        enregistrée.
      </p>
    );
  }

  const a = annonce;
  const ex = a.exigences ?? {};
  const infos: Array<[string, string | null | undefined]> = [
    ["Montant estimé", ex.montant_estime],
    ["Durée", ex.duree],
    ["Allotissement", ex.allotissement],
    ["CA minimum", ex.chiffre_affaires_min],
    ["Références", ex.references],
    ["Certifications exigées", ex.certifications?.length ? ex.certifications.join(", ") : null],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Radar className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">Annonce de veille :</span>
        <span className="font-medium">{a.intitule}</span>
        <Link
          to="/veille"
          className="text-xs text-primary hover:underline"
          onClick={() => {
            // La page Veille rouvre l'annonce mémorisée (onglet « Tous » pour la retrouver).
            try {
              window.localStorage.setItem("veille:annonce", JSON.stringify(a.id));
              window.localStorage.setItem("veille:filtre", JSON.stringify("tous"));
            } catch {
              // Stockage indisponible : la page Veille s'ouvre simplement.
            }
          }}
        >
          Ouvrir la veille
        </Link>
        {a.lien ? (
          <a
            href={a.lien}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
          >
            Avis BOAMP <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>

      {/* Qualification IA */}
      <section className="space-y-2 rounded-xl border p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Analyse IA de l&apos;avis
        </p>
        {a.qualif_statut === "qualifie" && a.decision ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-xs font-semibold",
                  DECISION_STYLES[a.decision],
                )}
              >
                {VEILLE_DECISION_LABELS[a.decision]}
                {a.score != null ? <span className="ml-1 tabular-nums">{a.score}</span> : null}
              </span>
              {a.entite && a.entite !== "aucune" ? (
                <span className="rounded border px-1.5 py-0.5 text-xs font-medium">{a.entite}</span>
              ) : null}
            </div>
            {a.resume ? <p className="text-sm leading-relaxed">{a.resume}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Liste titre="Pour" items={a.raisons} />
              <Liste titre="Points rouges" items={a.points_rouges} />
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {infos
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
            </dl>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Annonce non qualifiée.</p>
        )}
        <VeilleAvisDetail id={a.id} />
      </section>

      {/* Analyse du DCE et pièces lues */}
      <section className="rounded-xl border p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ScanSearch className="h-3.5 w-3.5" /> Analyse du DCE
        </p>
        <VeilleAnalysePanel annonce={a} canEdit={canEdit} defaultOpen />
        {canEdit ? <VeilleDepotDce a={a} aoId={aoId} onAnalyser={analyser} /> : null}
      </section>
    </div>
  );
}
