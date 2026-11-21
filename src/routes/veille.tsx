import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  Check,
  Mail,
  MapPin,
  MoreHorizontal,
  SlidersHorizontal,
  ExternalLink,
  EyeOff,
  FileDown,
  Footprints,
  History,
  Loader2,
  RefreshCw,
  Send,
  Upload,
  Sparkles,
  Radar,
  ScanSearch,
  Search,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/commerce/AppShell";
import { VeilleAnalysePanel } from "@/components/commerce/VeilleAnalysePanel";
import { VeilleRecipientsDialog } from "@/components/commerce/VeilleRecipientsDialog";
import { VeilleProfilDialog } from "@/components/commerce/VeilleProfilDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AO_SECTEUR_LABELS, type AoSecteurCode } from "@/lib/commerceTypes";
import {
  analyseEnAttenteApresEchec,
  analyseEnCours,
  libelleMotif,
  MOTIFS_IGNORE,
  type MotifIgnore,
  type VeilleAnnonceRow,
  type VeilleStatut,
} from "@/lib/veille";
import { VEILLE_DECISION_LABELS, type VeilleDecision } from "@/lib/veilleQualif";
import {
  useDemanderAnalyseDce,
  useImportVeilleToAo,
  useQualifierVeille,
  useRattraperVeille,
  useRefreshVeille,
  useSetVeilleStatut,
  useVeilleAnnonces,
  useResumerAvis,
  useVeilleAvisComplet,
} from "@/hooks/useVeille";
import { aplatirDonnees } from "@/lib/veilleAvis";
import { useCommerceAuth } from "@/hooks/useCommerceAuth";
import {
  debuterActivite,
  definirAnnonceOuverte,
  finirActivite,
  marquerAnnonce,
  useSuiviVeille,
  type MarqueSuivi,
} from "@/lib/veilleSuivi";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/veille")({
  head: () => ({
    meta: [
      { title: "Veille appels d'offres — Meselec Commerce" },
      {
        name: "description",
        content:
          "Annonces d'appels d'offres publics collectées automatiquement (BOAMP), filtrées sur l'éclairage public, les réseaux électriques, le CFO et la VRD en Île-de-France, dans l'Oise (60) et l'Eure (27).",
      },
      { property: "og:title", content: "Veille appels d'offres — Meselec Commerce" },
      {
        property: "og:description",
        content:
          "Collecte quotidienne BOAMP filtrée sur votre périmètre métier, avec envoi direct vers la base appels d'offres.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VeillePage,
});

const FILTRES: Array<{ value: VeilleStatut | "tous"; label: string }> = [
  { value: "nouveau", label: "À trier" },
  { value: "importe", label: "Envoyés aux AO" },
  { value: "ignore", label: "Ignorés" },
  { value: "tous", label: "Tous" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const DECISION_STYLES: Record<VeilleDecision, string> = {
  prioritaire: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  a_creuser: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  hors_sujet: "bg-muted text-muted-foreground",
};

function badgesAnnonce(a: VeilleAnnonceRow): string[] {
  const out: string[] = [];
  if (a.certif_manquante) out.push("Certif manquante");
  if (a.interet_relationnel) out.push("Intérêt relationnel");
  if (a.exigences?.avis_insuffisant) out.push("Avis insuffisant → lire RC");
  if (a.exigences?.visite_obligatoire) out.push("Visite obligatoire");
  return out;
}

function DecisionBadge({ a }: { a: VeilleAnnonceRow }) {
  if (a.qualif_statut === "erreur") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
        <AlertTriangle className="h-3 w-3" /> Erreur IA
      </span>
    );
  }
  if (a.qualif_statut !== "qualifie" || !a.decision) {
    return (
      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
        À qualifier
      </span>
    );
  }
  return (
    <span
      className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", DECISION_STYLES[a.decision])}
    >
      {VEILLE_DECISION_LABELS[a.decision]}
      {a.score != null ? <span className="ml-1 tabular-nums opacity-80">{a.score}</span> : null}
    </span>
  );
}

function ListeDetail({ titre, items }: { titre: string; items: string[] | undefined }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titre}
      </p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {items.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

/** Lignes « clé : valeur » de l'avis, sans les codes techniques eForms illisibles. */
function lignesLisibles(donnees: unknown): string[] {
  return aplatirDonnees(donnees, 60000)
    .split("\n")
    .filter((l) => {
      const sep = l.indexOf(" : ");
      if (sep < 0) return l.trim().length > 0;
      const cle = l.slice(0, sep);
      const val = l.slice(sep + 3).trim();
      // « … type code : works », « … code : not-allowed » : bruit technique.
      if (/\b(code|id|identifier)$/i.test(cle) && !/\s/.test(val)) return false;
      return val.length > 0;
    });
}

/** Secondes écoulées depuis que `actif` est passé à vrai (0 sinon). */
function useSecondes(actif: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!actif) {
      setS(0);
      return;
    }
    const debut = Date.now();
    const t = window.setInterval(() => setS(Math.round((Date.now() - debut) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [actif]);
  return s;
}

function ResumeIa({ id }: { id: string }) {
  const { data, isLoading } = useVeilleAvisComplet(id);
  const resumer = useResumerAvis();
  const resume = data?.avis_resume ?? null;
  // Le panneau garde ce composant d'une annonce à l'autre : on n'affiche l'état
  // (chargement, erreur) que s'il concerne l'annonce affichée.
  const pourCetteAnnonce = resumer.variables?.id === id;
  const enCours = resumer.isPending && pourCetteAnnonce;
  const secondes = useSecondes(enCours);
  function lancer(force = false) {
    debuterActivite(id, "resume", "Résumé IA");
    resumer.mutate(
      { id, force },
      {
        onSuccess: (res) => finirActivite(id, "resume", res.ok ? "pret" : "erreur"),
        onError: () => finirActivite(id, "resume", "erreur"),
      },
    );
  }
  // Pas de génération automatique : le résumé IA n'est lancé qu'au clic sur « Résumer l'avis ».

  const erreur = !pourCetteAnnonce
    ? null
    : resumer.data && !resumer.data.ok
      ? resumer.data.error
      : resumer.error instanceof Error
        ? resumer.error.message
        : null;

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Résumé IA de l'avis
        </p>
        {resume ? (
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
        ) : null}
      </div>
      {enCours && !resume ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            Claude lit l&apos;avis et rédige le résumé…{" "}
            <span className="tabular-nums">{secondes} s</span>
            {secondes >= 20 ? (
              <span className="block text-xs">
                Ça prend d&apos;habitude 10 à 30 s. Au-delà de 90 s, l&apos;erreur s&apos;affichera
                ici.
              </span>
            ) : null}
          </span>
        </div>
      ) : resume ? (
        <div className="space-y-3 text-sm">
          <p className="font-medium leading-relaxed">{resume.en_bref}</p>
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
      ) : erreur ? (
        <div className="space-y-2">
          <p className="text-xs text-destructive">{erreur}</p>
          <Button size="sm" variant="outline" onClick={() => lancer()}>
            Réessayer
          </Button>
        </div>
      ) : !isLoading && !data?.raw ? (
        <p className="text-xs text-muted-foreground">Texte de l'avis non disponible.</p>
      ) : (
        <Button size="sm" variant="outline" onClick={() => lancer()}>
          <Sparkles className="mr-1.5 h-4 w-4" /> Résumer l'avis
        </Button>
      )}
    </section>
  );
}

function TexteAvis({ id }: { id: string }) {
  const { data, isLoading } = useVeilleAvisComplet(id);
  const raw = data?.raw ?? null;
  if (isLoading || !raw?.["donnees"]) return null;
  const lignes = lignesLisibles(raw["donnees"]);
  if (!lignes.length) return null;

  return (
    <details className="group min-w-0 rounded-xl border bg-muted/20">
      <summary className="cursor-pointer select-none px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
        Texte intégral de l'avis
        <span className="ml-1.5 font-normal normal-case tracking-normal">
          ({lignes.length} lignes)
        </span>
      </summary>
      <dl className="space-y-2 border-t px-3.5 py-3 text-xs leading-relaxed">
        {lignes.map((l, i) => {
          const sep = l.indexOf(" : ");
          return sep > 0 ? (
            <div key={i} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground first-letter:uppercase">
                {l.slice(0, sep)}
              </dt>
              <dd className="[overflow-wrap:anywhere]">{l.slice(sep + 3)}</dd>
            </div>
          ) : (
            <p key={i} className="[overflow-wrap:anywhere]">
              {l}
            </p>
          );
        })}
      </dl>
    </details>
  );
}

/** Jours restants avant la date limite (négatif si dépassée), ou null. */
function joursRestants(value: string | null): number | null {
  if (!value) return null;
  const limite = new Date(value);
  limite.setHours(0, 0, 0, 0);
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  return Math.round((limite.getTime() - auj.getTime()) / 86_400_000);
}

function Echeance({ date, className }: { date: string | null; className?: string }) {
  const j = joursRestants(date);
  if (j == null) {
    return <span className={cn("text-muted-foreground", className)}>Limite —</span>;
  }
  const label = j < 0 ? "Clos" : j === 0 ? "Aujourd'hui" : `J-${j}`;
  return (
    <span
      title={`Limite ${formatDate(date)}`}
      className={cn(
        "tabular-nums",
        j < 0
          ? "text-muted-foreground line-through"
          : j <= 7
            ? "font-semibold text-red-600 dark:text-red-400"
            : j <= 14
              ? "font-medium text-amber-700 dark:text-amber-400"
              : "text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

const SCORE_STYLES: Record<VeilleDecision, string> = {
  prioritaire: "bg-emerald-600 text-white dark:bg-emerald-500",
  a_creuser: "bg-amber-500 text-white dark:bg-amber-500",
  hors_sujet: "bg-muted text-muted-foreground",
};

/** Pastille de score (couleur = décision IA). */
function Score({ a, enCours }: { a: VeilleAnnonceRow; enCours: boolean }) {
  if (a.qualif_statut === "qualifie" && a.decision) {
    return (
      <span
        title={VEILLE_DECISION_LABELS[a.decision]}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
          SCORE_STYLES[a.decision],
        )}
      >
        {a.score ?? "·"}
      </span>
    );
  }
  return (
    <span
      title={
        a.qualif_statut === "erreur"
          ? "Erreur de qualification IA"
          : "Pas encore qualifiée par l'IA (score, décision)"
      }
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground"
    >
      {enCours ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : a.qualif_statut === "erreur" ? (
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 opacity-50" />
      )}
    </span>
  );
}

/** Ligne compacte de la liste : tout ce qu'il faut pour décider d'un coup d'œil. */
function LigneAnnonce({
  a,
  active,
  enCours,
  activites,
  marque,
  onSelect,
  refLigne,
}: {
  a: VeilleAnnonceRow;
  active: boolean;
  enCours: boolean;
  /** Traitements en cours sur l'annonce (libellés). */
  activites: string[];
  /** Résultat arrivé pendant qu'on regardait ailleurs. */
  marque: MarqueSuivi | undefined;
  onSelect: () => void;
  refLigne: (el: HTMLButtonElement | null) => void;
}) {
  const visite =
    a.analyse_dce?.visite.exigee === "obligatoire" ||
    (!a.analyse_dce && (a.exigences?.visite_obligatoire || a.avis_indices?.visite?.obligatoire));
  return (
    <button
      ref={refLigne}
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex w-full shrink-0 items-start gap-3 overflow-hidden rounded-xl border py-2.5 pl-4 pr-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border/60 bg-card hover:border-border hover:bg-muted/40",
        a.statut !== "nouveau" && "opacity-70",
      )}
    >
      {activites.length || marque ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-1.5",
            activites.length
              ? "animate-pulse bg-primary"
              : marque === "erreur"
                ? "bg-destructive"
                : "bg-emerald-500",
          )}
        />
      ) : null}
      <Score a={a} enCours={enCours} />
      <div className="min-w-0 flex-1">
        {activites.length ? (
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            <span className="min-w-0 truncate">{activites.join(" · ")}</span>
          </p>
        ) : marque ? (
          <p
            className={cn(
              "mb-1 flex items-center gap-1.5 text-[11px] font-semibold",
              marque === "erreur" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400",
            )}
          >
            {marque === "erreur" ? (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            )}
            {marque === "erreur" ? "Échec : à revoir" : "Terminé : nouveau résultat"}
          </p>
        ) : null}
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {a.intitule}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[a.acheteur, a.departement ? `Dép. ${a.departement}` : null].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          {(a.secteurs as AoSecteurCode[]).map((s) => (
            <span key={s} className="rounded bg-primary/10 px-1.5 py-px font-medium text-primary">
              {AO_SECTEUR_LABELS[s] ?? s}
            </span>
          ))}
          {a.entite && a.entite !== "aucune" ? (
            <span className="rounded border px-1.5 py-px font-medium">{a.entite}</span>
          ) : null}
          {analyseEnAttenteApresEchec(a) ? (
            <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" /> DCE non récupéré
            </span>
          ) : a.analyse_dce ? (
            <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400">
              <ScanSearch className="h-3 w-3" /> DCE lu
            </span>
          ) : null}
          {visite ? (
            <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
              <Footprints className="h-3 w-3" /> Visite
            </span>
          ) : null}
          {a.certif_manquante ? (
            <span className="text-amber-700 dark:text-amber-400">Certif manquante</span>
          ) : null}
          {a.statut === "importe" ? (
            <span className="inline-flex items-center gap-0.5 text-primary">
              <Check className="h-3 w-3" /> Dans les AO
            </span>
          ) : a.statut === "ignore" ? (
            <span className="text-muted-foreground" title={a.motif_ignore_note ?? undefined}>
              Ignorée{libelleMotif(a.motif_ignore) ? ` · ${libelleMotif(a.motif_ignore)}` : ""}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5 text-[11px] leading-tight">
        <Echeance date={a.date_limite} className="text-xs" />
        <span className="tabular-nums text-muted-foreground" title="Date limite de dépôt">
          Dépôt {formatDate(a.date_limite)}
        </span>
        <span className="tabular-nums text-muted-foreground" title="Date de parution">
          Paru {formatDate(a.date_parution)}
        </span>
      </div>
    </button>
  );
}

type FichierDepose = { nom: string; taille: number };

function tailleLisible(octets: number) {
  return octets >= 1024 * 1024
    ? `${(octets / 1024 / 1024).toFixed(1)} Mo`
    : `${Math.max(1, Math.round(octets / 1024))} Ko`;
}

/**
 * Dépôt manuel du DCE (RC, CCTP, ZIP…) quand le robot ne peut pas le télécharger.
 * Les fichiers s'ajoutent dans `veille-dce/<annonce>/depot/` (en une ou plusieurs
 * fois), puis l'analyse est lancée à la demande : le robot lit ces pièces.
 */
function DepotDce({
  a,
  onAnalyser,
}: {
  a: VeilleAnnonceRow;
  onAnalyser: (a: VeilleAnnonceRow) => void;
}) {
  const qc = useQueryClient();
  const dossier = `${a.id}/depot`;
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const secondes = useSecondes(envoi != null);

  const { data: fichiers = [], isLoading } = useQuery({
    queryKey: ["veille-depot", a.id],
    queryFn: async (): Promise<FichierDepose[]> => {
      const { data, error } = await supabase.storage.from("veille-dce").list(dossier);
      if (error) throw error;
      return (data ?? [])
        .filter((f) => f.name && !f.name.startsWith("."))
        .map((f) => ({ nom: f.name, taille: Number(f.metadata?.["size"] ?? 0) }));
    },
  });
  const rafraichir = () => qc.invalidateQueries({ queryKey: ["veille-depot", a.id] });

  async function deposer(liste: FileList | null) {
    const nouveaux = Array.from(liste ?? []);
    if (!nouveaux.length || envoi) return;
    setErreur(null);
    const tropGros = nouveaux.find((f) => f.size > 50 * 1024 * 1024);
    if (tropGros) {
      setErreur(`${tropGros.name} dépasse 50 Mo (limite par fichier).`);
      return;
    }
    let echec = false;
    try {
      for (const [i, f] of nouveaux.entries()) {
        debuterActivite(
          a.id,
          "depot",
          `Envoi de fichiers${nouveaux.length > 1 ? ` ${i + 1}/${nouveaux.length}` : ""}`,
        );
        setEnvoi(
          `Envoi de ${f.name} (${tailleLisible(f.size)})${nouveaux.length > 1 ? ` · ${i + 1}/${nouveaux.length}` : ""}`,
        );
        const nom = f.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
        const { error } = await supabase.storage
          .from("veille-dce")
          .upload(
            `${dossier}/${nom}`,
            f,
            f.type ? { upsert: true, contentType: f.type } : { upsert: true },
          );
        if (error) throw new Error(`${f.name} : ${error.message}`);
      }
    } catch (e) {
      echec = true;
      setErreur(e instanceof Error ? e.message : "Dépôt impossible");
    } finally {
      finirActivite(a.id, "depot", echec ? "erreur" : "pret");
      setEnvoi(null);
      if (input.current) input.current.value = "";
      void rafraichir();
    }
  }

  async function supprimer(nom: string) {
    const { error } = await supabase.storage.from("veille-dce").remove([`${dossier}/${nom}`]);
    if (error) setErreur(`${nom} : ${error.message}`);
    void rafraichir();
  }

  const robotEnCours = analyseEnCours(a);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSurvol(false);
        void deposer(e.dataTransfer.files);
      }}
      className={cn(
        "mt-3 space-y-2 rounded-lg border border-dashed px-3 py-2.5 text-xs transition-colors",
        survol ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 flex-1 text-muted-foreground">
          DCE téléchargé toi-même ? Glisse ici le RC, le CCTP ou le ZIP, en une ou plusieurs fois,
          puis lance l&apos;analyse.
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.zip,.7z,.rar,.doc,.docx,.odt"
          className="hidden"
          onChange={(e) => void deposer(e.target.files)}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={envoi != null}
          onClick={() => input.current?.click()}
        >
          {fichiers.length ? "Ajouter des fichiers" : "Choisir des fichiers"}
        </Button>
      </div>

      {envoi ? (
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          <span className="min-w-0 truncate">{envoi}</span>
          <span className="tabular-nums">{secondes} s</span>
        </p>
      ) : null}
      {erreur ? <p className="text-destructive">{erreur}</p> : null}

      {isLoading ? null : fichiers.length ? (
        <>
          <ul className="space-y-1">
            {fichiers.map((f) => (
              <li
                key={f.nom}
                className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1 text-foreground"
              >
                <FileDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate" title={f.nom}>
                  {f.nom}
                </span>
                {f.taille ? (
                  <span className="tabular-nums text-muted-foreground">
                    {tailleLisible(f.taille)}
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Retirer ${f.nom}`}
                  disabled={robotEnCours}
                  onClick={() => void supprimer(f.nom)}
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={envoi != null || robotEnCours}
              onClick={() => onAnalyser(a)}
            >
              <ScanSearch className="mr-1 h-3.5 w-3.5" />
              Analyser ces {fichiers.length} fichier{fichiers.length > 1 ? "s" : ""}
            </Button>
            {robotEnCours ? (
              <span className="text-muted-foreground">Analyse en cours : suivi ci-dessus.</span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Choix du motif quand on ignore une annonce (touches 1 à 8, Entrée pour valider). */
function DialogueMotif({
  annonce,
  onFermer,
  onValider,
}: {
  annonce: VeilleAnnonceRow | null;
  onFermer: () => void;
  onValider: (a: VeilleAnnonceRow, motif: MotifIgnore, note: string) => void;
}) {
  const [motif, setMotif] = useState<MotifIgnore | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => {
    setMotif(null);
    setNote("");
  }, [annonce?.id]);

  const valide = motif != null && (motif !== "autre" || note.trim().length > 0);
  function valider(m: MotifIgnore | null = motif) {
    if (!annonce || !m || (m === "autre" && !note.trim())) return;
    onValider(annonce, m, note);
  }

  return (
    <Dialog open={annonce != null} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent
        className="sm:max-w-md"
        onKeyDown={(e) => {
          const cible = e.target as HTMLElement;
          if (cible.tagName === "INPUT" || cible.tagName === "TEXTAREA") {
            if (e.key === "Enter" && valide) {
              e.preventDefault();
              valider();
            }
            return;
          }
          const n = Number(e.key);
          const choix = MOTIFS_IGNORE[n - 1];
          if (choix) {
            e.preventDefault();
            setMotif(choix.code);
            // Un motif sans précision à donner : validé tout de suite.
            if (choix.code !== "autre" && !note.trim()) valider(choix.code);
          } else if (e.key === "Enter" && valide) {
            e.preventDefault();
            valider();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Pourquoi ce n&apos;est pas pour nous ?</DialogTitle>
          <DialogDescription className="line-clamp-2">{annonce?.intitule}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          {MOTIFS_IGNORE.map((m, i) => (
            <button
              key={m.code}
              type="button"
              onClick={() => setMotif(m.code)}
              onDoubleClick={() => m.code !== "autre" && valider(m.code)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                motif === m.code
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border hover:bg-muted",
              )}
            >
              <kbd className="flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[11px] text-muted-foreground">
                {i + 1}
              </kbd>
              {m.label}
            </button>
          ))}
        </div>
        <Input
          placeholder={
            motif === "autre" ? "Précisez le motif (obligatoire)" : "Précision (facultatif)"
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-9"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onFermer}>
            Annuler
          </Button>
          <Button disabled={!valide} onClick={() => valider()}>
            <EyeOff className="mr-1.5 h-4 w-4" /> Ignorer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1.5 hidden rounded border border-current/30 px-1 font-mono text-[10px] leading-4 opacity-70 lg:inline-block">
      {children}
    </kbd>
  );
}

type ActionsAnnonce = {
  envoyer: (a: VeilleAnnonceRow) => void;
  ignorer: (a: VeilleAnnonceRow) => void;
  confirmerIgnore: (a: VeilleAnnonceRow, motif: MotifIgnore, note: string) => void;
  analyser: (a: VeilleAnnonceRow) => void;
  requalifier: (a: VeilleAnnonceRow) => void;
  ouvrirAo: (a: VeilleAnnonceRow) => void;
  occupe: boolean;
};

/** Panneau de décision : verdict IA, analyse DCE, résumé de l'avis et actions. */
function PanneauAnnonce({
  a,
  canEdit,
  actions,
}: {
  a: VeilleAnnonceRow;
  canEdit: boolean;
  actions: ActionsAnnonce;
}) {
  const ex = a.exigences ?? {};
  const dce = a.dce_url ?? a.url_dce;
  const lignes: Array<[string, string | null | undefined]> = [
    ["Type de marché", a.type_marche],
    ["Montant estimé", ex.montant_estime],
    ["Durée", ex.duree],
    ["Allotissement", ex.allotissement],
    ["CA minimum", ex.chiffre_affaires_min],
    ["Références", ex.references],
    ["Date de visite", ex.date_visite],
    ["Certifications exigées", ex.certifications?.length ? ex.certifications.join(", ") : null],
    ["Source", [a.source, a.plateforme].filter(Boolean).join(" · ")],
    ["CPV", a.cpv],
  ];

  return (
    <div className="min-w-0">
      {/* En-tête collant : titre + décision, toujours à portée de main. */}
      <div className="sticky top-0 z-10 space-y-3 border-b bg-card/95 px-4 pb-3 pt-4 backdrop-blur sm:px-5">
        <div>
          <h2 className="text-base font-semibold leading-snug">{a.intitule}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {[a.acheteur, a.departement ? `Dép. ${a.departement}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
            <span>
              <span className="text-muted-foreground">Parution </span>
              <span className="tabular-nums">{formatDate(a.date_parution)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Dépôt limite </span>
              <span className="tabular-nums font-medium">{formatDate(a.date_limite)}</span>
              {a.date_limite ? (
                <>
                  {" "}
                  (<Echeance date={a.date_limite} />)
                </>
              ) : null}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && a.statut !== "importe" ? (
            <Button size="sm" disabled={actions.occupe} onClick={() => actions.envoyer(a)}>
              <Send className="mr-1.5 h-4 w-4" /> Envoyer vers les AO <Kbd>E</Kbd>
            </Button>
          ) : null}
          {a.statut === "importe" && a.ao_id ? (
            <Button size="sm" onClick={() => actions.ouvrirAo(a)}>
              <ArrowRight className="mr-1.5 h-4 w-4" /> Ouvrir l&apos;AO
            </Button>
          ) : null}
          {canEdit && a.statut !== "importe" ? (
            <Button size="sm" variant="outline" onClick={() => actions.ignorer(a)}>
              <EyeOff className="mr-1.5 h-4 w-4" />
              {a.statut === "ignore" ? "Restaurer" : "Pas pour nous"} <Kbd>I</Kbd>
            </Button>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            {dce ? (
              <Button size="sm" variant="ghost" asChild>
                <a href={dce} target="_blank" rel="noreferrer">
                  <FileDown className="mr-1.5 h-4 w-4" /> DCE
                </a>
              </Button>
            ) : null}
            {a.lien ? (
              <Button size="sm" variant="ghost" asChild>
                <a href={a.lien} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-4 w-4" /> Avis
                </a>
              </Button>
            ) : null}
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="px-2" aria-label="Autres actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onSelect={() => actions.analyser(a)}
                    disabled={analyseEnCours(a)}
                  >
                    <ScanSearch className="mr-2 h-4 w-4" />
                    {a.analyse_dce ? "Relancer l'analyse DCE" : "Analyser le DCE"}
                    <span className="ml-auto font-mono text-[10px] opacity-60">A</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => actions.requalifier(a)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {a.qualif_statut === "qualifie" ? "Requalifier (IA)" : "Qualifier (IA)"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {a.statut === "ignore" ? (
          <p className="flex items-start gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              Ignorée
              {libelleMotif(a.motif_ignore) ? (
                <>
                  {" : "}
                  <span className="font-medium">{libelleMotif(a.motif_ignore)}</span>
                </>
              ) : null}
              {a.motif_ignore_note ? (
                <span className="text-muted-foreground"> · {a.motif_ignore_note}</span>
              ) : null}
            </span>
          </p>
        ) : null}
        {/* 1. Verdict de la qualification IA */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <DecisionBadge a={a} />
            {a.entite && a.entite !== "aucune" ? (
              <span className="rounded border px-1.5 py-0.5 text-xs font-medium">{a.entite}</span>
            ) : null}
            {badgesAnnonce(a).map((b) => (
              <span
                key={b}
                className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              >
                {b}
              </span>
            ))}
          </div>
          {canEdit && a.qualif_statut !== "qualifie" ? (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={() => actions.requalifier(a)}
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Qualifier cette annonce (IA)
            </Button>
          ) : null}
          {a.qualif_error ? (
            <p className="rounded bg-destructive/10 p-2 text-xs text-destructive">
              {a.qualif_error}
            </p>
          ) : null}
          {a.resume ? <p className="text-sm leading-relaxed">{a.resume}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <ListeDetail titre="Pour" items={a.raisons} />
            <ListeDetail titre="Points rouges" items={a.points_rouges} />
          </div>
        </section>

        {/* 2. Analyse du DCE (visite, certifications) */}
        <section className="rounded-xl border p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ScanSearch className="h-3.5 w-3.5" /> Analyse du DCE
          </p>
          {!a.analyse_dce && a.analyse_statut !== "a_faire" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Le robot télécharge le RC / CCTP et en extrait visite, certifications et points
              d&apos;attention.
            </p>
          ) : null}
          <VeilleAnalysePanel key={`analyse-${a.id}`} annonce={a} canEdit={canEdit} defaultOpen />
          {canEdit && a.analyse_statut !== "termine" ? (
            <DepotDce key={`depot-${a.id}`} a={a} onAnalyser={actions.analyser} />
          ) : null}
        </section>

        {/* 3. Résumé IA de l'avis, généré automatiquement */}
        <ResumeIa id={a.id} />

        {/* 4. Infos clés */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {lignes
            .filter(([, v]) => v && v !== "—")
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="break-words">{v}</dd>
              </div>
            ))}
        </dl>
        {ex.criteres_attribution?.length ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Critères d'attribution
            </p>
            <ul className="space-y-0.5 text-sm">
              {ex.criteres_attribution.map((c, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{c.critere}</span>
                  <span className="tabular-nums text-muted-foreground">{c.ponderation ?? "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <TexteAvis id={a.id} />
      </div>
    </div>
  );
}

type Periode = "toutes" | "aujourdhui" | "7j" | "14j" | "30j" | "90j" | "perso";

const PERIODES: Array<{ value: Periode; label: string; jours?: number }> = [
  { value: "toutes", label: "Toutes dates" },
  { value: "aujourdhui", label: "Aujourd'hui", jours: 0 },
  { value: "7j", label: "7 derniers jours", jours: 7 },
  { value: "14j", label: "14 derniers jours", jours: 14 },
  { value: "30j", label: "30 derniers jours", jours: 30 },
  { value: "90j", label: "3 derniers mois", jours: 90 },
  { value: "perso", label: "Personnalisée…" },
];

function toIsoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${j}`;
}

/** Bornes [du, au] (jours ISO inclus) de la période, ou null si pas de filtre. */
function bornesPeriode(
  periode: Periode,
  du: string,
  au: string,
): { du: string | null; au: string | null } | null {
  if (periode === "toutes") return null;
  if (periode === "perso") return du || au ? { du: du || null, au: au || null } : null;
  const jours = PERIODES.find((p) => p.value === periode)?.jours ?? 0;
  const debut = new Date();
  debut.setDate(debut.getDate() - jours);
  return { du: toIsoDay(debut), au: null };
}

function labelPeriode(periode: Periode, du: string, au: string) {
  if (periode !== "perso") return PERIODES.find((p) => p.value === periode)?.label ?? "";
  const fmt = (v: string) =>
    new Date(`${v}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  if (du && au) return `${fmt(du)} → ${fmt(au)}`;
  if (du) return `Depuis le ${fmt(du)}`;
  if (au) return `Jusqu'au ${fmt(au)}`;
  return "Toutes dates";
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

const RANG_DECISION: Record<string, number> = { prioritaire: 0, a_creuser: 1, hors_sujet: 3 };

/** Ordre de tri : prioritaires, à creuser, non qualifiées, hors sujet ; puis score, puis échéance. */
function comparerAnnonces(a: VeilleAnnonceRow, b: VeilleAnnonceRow) {
  const ra = a.decision ? (RANG_DECISION[a.decision] ?? 2) : 2;
  const rb = b.decision ? (RANG_DECISION[b.decision] ?? 2) : 2;
  if (ra !== rb) return ra - rb;
  const s = (b.score ?? -1) - (a.score ?? -1);
  if (s !== 0) return s;
  return (a.date_limite ?? "9999").localeCompare(b.date_limite ?? "9999");
}

function useEcranLarge() {
  const [large, setLarge] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const maj = () => setLarge(mql.matches);
    maj();
    mql.addEventListener("change", maj);
    return () => mql.removeEventListener("change", maj);
  }, []);
  return large;
}

/**
 * État gardé dans le navigateur d'une visite à l'autre (filtres, annonce ouverte).
 * Lu après le premier rendu pour ne pas gêner le rendu serveur.
 */
function useEtatMemorise<T>(cle: string, initial: T): [T, (v: T) => void, boolean] {
  const [valeur, setValeur] = useState<T>(initial);
  const [charge, setCharge] = useState(false);
  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(`veille:${cle}`);
      if (brut != null) setValeur(JSON.parse(brut) as T);
    } catch {
      // Stockage indisponible : on garde la valeur par défaut.
    }
    setCharge(true);
  }, [cle]);
  useEffect(() => {
    if (!charge) return;
    try {
      window.localStorage.setItem(`veille:${cle}`, JSON.stringify(valeur));
    } catch {
      // Stockage indisponible (navigation privée) : rien à faire.
    }
  }, [cle, valeur, charge]);
  return [valeur, setValeur, charge];
}

function VeillePage() {
  const navigate = useNavigate();
  const { hasEditorAccess } = useCommerceAuth();
  const canEdit = hasEditorAccess("appels_offres");
  const large = useEcranLarge();
  const [filtre, setFiltre] = useEtatMemorise<VeilleStatut | "tous">("filtre", "nouveau");
  const [filtreSuivi, setFiltreSuivi] = useState<"aucun" | "en_cours" | "a_revoir">("aucun");
  const [idfSeulement, setIdfSeulement] = useState(true);
  const [search, setSearch] = useState("");
  const [voirHorsSujet, setVoirHorsSujet] = useEtatMemorise("horsSujet", false);
  const [filtreEntite, setFiltreEntite] = useEtatMemorise<string>("entite", "toutes");
  const [filtreDecision, setFiltreDecision] = useEtatMemorise<string>("decision", "toutes");
  const [selectionId, setSelectionId, selectionChargee] = useEtatMemorise<string | null>(
    "annonce",
    null,
  );
  const [mobileOuvert, setMobileOuvert] = useState(false);
  const [motifPour, setMotifPour] = useState<VeilleAnnonceRow | null>(null);
  const [periode, setPeriode] = useEtatMemorise<Periode>("periode", "toutes");
  const [periodeDu, setPeriodeDu] = useEtatMemorise("periodeDu", "");
  const [periodeAu, setPeriodeAu] = useEtatMemorise("periodeAu", "");
  const [periodeOuverte, setPeriodeOuverte] = useState(false);
  const [profilOuvert, setProfilOuvert] = useState(false);
  const [destinatairesOuvert, setDestinatairesOuvert] = useState(false);
  const qualifier = useQualifierVeille();
  const rattraper = useRattraperVeille();
  const { data: annonces = [], isLoading } = useVeilleAnnonces();
  const refresh = useRefreshVeille();
  const setStatut = useSetVeilleStatut();
  const importAo = useImportVeilleToAo();
  const demanderDce = useDemanderAnalyseDce();
  const lignesRef = useRef(new Map<string, HTMLButtonElement>());
  const dernierIndex = useRef(0);

  const horsSujetMasquees = useMemo(
    () => annonces.filter((a) => a.decision === "hors_sujet").length,
    [annonces],
  );

  const matching = useMemo(() => {
    const terms = normalizeSearch(search).split(/\s+/).filter(Boolean);
    const bornes = bornesPeriode(periode, periodeDu, periodeAu);
    const base = annonces
      .filter((a) => {
        if (!bornes) return true;
        const jour = (a.date_parution ?? a.created_at)?.slice(0, 10);
        if (!jour) return false;
        if (bornes.du && jour < bornes.du) return false;
        if (bornes.au && jour > bornes.au) return false;
        return true;
      })
      .filter(
        (a) => voirHorsSujet || filtreDecision === "hors_sujet" || a.decision !== "hors_sujet",
      )
      .filter((a) => filtreEntite === "toutes" || a.entite === filtreEntite)
      .filter((a) =>
        filtreDecision === "toutes"
          ? true
          : filtreDecision === "a_qualifier"
            ? a.qualif_statut !== "qualifie"
            : a.decision === filtreDecision,
      );
    if (terms.length === 0) return base;
    return base.filter((a) => {
      const haystack = normalizeSearch(
        [
          a.intitule,
          a.acheteur,
          a.departement,
          a.source,
          ...(a.secteurs as AoSecteurCode[]).map((s) => AO_SECTEUR_LABELS[s] ?? s),
        ]
          .filter(Boolean)
          .join(" "),
      );
      return terms.every((t) => haystack.includes(t));
    });
  }, [
    annonces,
    search,
    voirHorsSujet,
    filtreEntite,
    filtreDecision,
    periode,
    periodeDu,
    periodeAu,
  ]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { tous: matching.length };
    for (const a of matching) c[a.statut] = (c[a.statut] ?? 0) + 1;
    return c;
  }, [matching]);

  // Traitements en cours par annonce : robot DCE, qualification IA, envois et résumés.
  const suivi = useSuiviVeille();
  const activitesDe = (a: VeilleAnnonceRow): string[] => {
    const l = Object.values(suivi.activites[a.id] ?? {});
    if (analyseEnCours(a)) {
      l.push(a.analyse_etape ? `Robot DCE : ${a.analyse_etape}` : "Analyse du DCE");
    }
    if (
      qualifier.isPending &&
      (a.qualif_statut ?? "a_qualifier") === "a_qualifier" &&
      !l.includes("Qualification IA")
    ) {
      l.push("Qualification IA");
    }
    return l;
  };
  const nbEnCours = matching.filter((a) => activitesDe(a).length > 0).length;
  const nbARevoir = matching.filter((a) => suivi.marques[a.id]).length;

  const items = useMemo(() => {
    const list =
      filtreSuivi === "en_cours"
        ? matching.filter((a) => activitesDe(a).length > 0)
        : filtreSuivi === "a_revoir"
          ? matching.filter((a) => suivi.marques[a.id])
          : filtre === "tous"
            ? matching
            : matching.filter((a) => a.statut === filtre);
    return [...list].sort(comparerAnnonces);
    // activitesDe dépend de suivi et de qualifier.isPending, listés ici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matching, filtre, filtreSuivi, suivi, qualifier.isPending]);

  // Annonce affichée : la sélection, sinon celle qui a pris sa place dans la liste
  // (après un tri, l'annonce suivante s'affiche d'elle-même).
  const indexSelection = items.findIndex((a) => a.id === selectionId);
  // L'annonce ouverte reste affichée même si elle n'est plus dans l'onglet
  // (passée dans « Envoyés aux AO », ou hors filtre après un rechargement).
  const horsListe =
    indexSelection < 0 && selectionId ? (annonces.find((a) => a.id === selectionId) ?? null) : null;
  const courante =
    indexSelection >= 0
      ? items[indexSelection]
      : (horsListe ??
        (selectionChargee
          ? (items[Math.min(dernierIndex.current, items.length - 1)] ?? null)
          : null));
  const indexCourant = courante ? items.indexOf(courante) : -1;
  useEffect(() => {
    definirAnnonceOuverte(courante?.id ?? null);
  }, [courante?.id]);
  useEffect(() => () => definirAnnonceOuverte(null), []);

  // Un traitement côté serveur (robot DCE, qualification IA) vient de se terminer :
  // marque « à revoir » sur l'annonce si on ne la regarde pas.
  const etatsPrecedents = useRef<Map<string, { dce: boolean; qualif: string }> | null>(null);
  useEffect(() => {
    if (isLoading) return;
    const avant = etatsPrecedents.current;
    const apres = new Map<string, { dce: boolean; qualif: string }>();
    for (const a of annonces) {
      const e = { dce: analyseEnCours(a), qualif: a.qualif_statut ?? "a_qualifier" };
      apres.set(a.id, e);
      const p = avant?.get(a.id);
      if (!p) continue;
      if (p.dce && !e.dce) {
        const rate = analyseEnAttenteApresEchec(a) || a.analyse_statut === "echec";
        marquerAnnonce(a.id, rate ? "erreur" : "pret");
      }
      if (p.qualif !== e.qualif && (e.qualif === "qualifie" || e.qualif === "erreur")) {
        marquerAnnonce(a.id, e.qualif === "erreur" ? "erreur" : "pret");
      }
    }
    etatsPrecedents.current = apres;
  }, [annonces, isLoading]);

  useEffect(() => {
    if (indexCourant >= 0) dernierIndex.current = indexCourant;
  }, [indexCourant]);

  useEffect(() => {
    if (!courante) return;
    lignesRef.current.get(courante.id)?.scrollIntoView({ block: "nearest" });
  }, [courante]);

  function toastQualif(res: {
    ok: boolean;
    error?: string;
    traitees: number;
    qualifiees: number;
    erreurs: number;
  }) {
    if (!res.ok) {
      toast.error(res.error ?? "Qualification impossible");
      return;
    }
    if (res.traitees === 0) toast.info("Aucune annonce en attente de qualification");
    else
      toast.success(
        `${res.qualifiees} annonce(s) qualifiée(s)${res.erreurs ? ` · ${res.erreurs} en erreur` : ""}`,
      );
  }

  function qualifierEnAttente(silencieux = false, ids?: string[]) {
    qualifier.mutate(ids ? { ids } : { limit: 100 }, {
      onSuccess: (res) => {
        if (silencieux && res.ok && res.traitees === 0) return;
        toastQualif(res);
      },
      onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Échec"),
    });
  }

  function requalifier(a: VeilleAnnonceRow) {
    debuterActivite(a.id, "qualif", "Qualification IA");
    qualifier.mutate(
      { ids: [a.id] },
      {
        onSuccess: (res) => {
          finirActivite(a.id, "qualif", res.ok && res.qualifiees > 0 ? "pret" : "erreur");
          toastQualif(res);
        },
        onError: (e: unknown) => {
          finirActivite(a.id, "qualif", "erreur");
          toast.error(e instanceof Error ? e.message : "Échec");
        },
      },
    );
  }

  function rattraper14() {
    rattraper.mutate(
      { jours: 14 },
      {
        onSuccess: (res) => {
          if (!res.ok) {
            toast.error(res.error ?? "Rattrapage impossible");
            return;
          }
          toast.success(
            `${res.rattrapees} avis complété(s) · ${res.qualifiees} qualifiée(s)${res.erreurs ? ` · ${res.erreurs} en erreur` : ""}`,
          );
        },
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Échec"),
      },
    );
  }

  function lancerVeille() {
    refresh.mutate(
      { fenetreJours: 7, idfSeulement },
      {
        onSuccess: (res) => {
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(
            `${res.nouvelles} nouvelle(s) annonce(s) · ${res.retenues} dans le périmètre sur ${res.collectees} collectées`,
          );
          // Qualification IA des seules annonces qui viennent d'arriver (pas de l'historique).
          if (res.idsNouvelles.length > 0) qualifierEnAttente(true, res.idsNouvelles);
        },
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : "Échec de la collecte"),
      },
    );
  }

  /** Passe à l'annonce suivante (ou précédente en fin de liste) après une décision. */
  function avancerApres(a: VeilleAnnonceRow) {
    const i = items.findIndex((x) => x.id === a.id);
    const suivante = items[i + 1] ?? items[i - 1] ?? null;
    setSelectionId(suivante?.id ?? null);
    if (!large) setMobileOuvert(false);
  }

  const actions: ActionsAnnonce = {
    occupe: importAo.isPending,
    envoyer: (a) => {
      if (a.statut === "importe") return;
      avancerApres(a);
      importAo.mutate(a, {
        onSuccess: (aoId) =>
          toast.success("Envoyée dans les appels d'offres", {
            action: {
              label: "Ouvrir l'AO",
              onClick: () => void navigate({ to: "/appels-offres/$aoId", params: { aoId } }),
            },
          }),
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Échec de l'import"),
      });
    },
    ignorer: (a) => {
      if (a.statut === "importe") return;
      if (a.statut === "ignore") {
        setStatut.mutate(
          { id: a.id, statut: "nouveau" },
          { onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Échec") },
        );
        return;
      }
      // On demande d'abord pourquoi : le motif est enregistré avec l'annonce.
      setMotifPour(a);
    },
    confirmerIgnore: (a, motif, note) => {
      setMotifPour(null);
      avancerApres(a);
      setStatut.mutate(
        { id: a.id, statut: "ignore", motif, note },
        {
          onSuccess: () => {
            toast(`Annonce ignorée : ${libelleMotif(motif) ?? motif}`, {
              action: {
                label: "Annuler",
                onClick: () => {
                  setStatut.mutate({ id: a.id, statut: "nouveau" });
                  setSelectionId(a.id);
                },
              },
            });
          },
          onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Échec"),
        },
      );
    },
    analyser: (a) => {
      if (analyseEnCours(a)) return;
      demanderDce.mutate(a.id, {
        onSuccess: (res) =>
          toast.success(
            res.lance
              ? "Analyse du DCE lancée : résultat dans quelques minutes"
              : "Analyse demandée : elle sera faite au prochain passage du robot",
          ),
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : "Impossible de lancer l'analyse"),
      });
    },
    requalifier,
    ouvrirAo: (a) => {
      if (a.ao_id) void navigate({ to: "/appels-offres/$aoId", params: { aoId: a.ao_id } });
    },
  };

  // Raccourcis clavier : j/k (ou ↓/↑) pour naviguer, E envoyer, I ignorer, A analyser le DCE.
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || profilOuvert || destinatairesOuvert || motifPour)
        return;
      const cible = e.target as HTMLElement | null;
      if (
        cible &&
        (cible.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(cible.tagName))
      )
        return;
      if (document.querySelector("[role=dialog],[role=menu],[role=listbox]") && large) return;
      const touche = e.key.toLowerCase();
      if (touche === "j" || e.key === "ArrowDown" || touche === "k" || e.key === "ArrowUp") {
        if (!items.length) return;
        e.preventDefault();
        const pas = touche === "j" || e.key === "ArrowDown" ? 1 : -1;
        const i = Math.min(Math.max(indexCourant + pas, 0), items.length - 1);
        setSelectionId(items[i]?.id ?? null);
        return;
      }
      if (!courante || !canEdit) return;
      if (touche === "e") actionsRef.current.envoyer(courante);
      else if (touche === "i") actionsRef.current.ignorer(courante);
      else if (touche === "a") actionsRef.current.analyser(courante);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    items,
    indexCourant,
    courante,
    canEdit,
    large,
    profilOuvert,
    destinatairesOuvert,
    setSelectionId,
    motifPour,
  ]);

  const listeVide =
    !isLoading && items.length === 0 ? (
      <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
        {filtre === "nouveau" && !search.trim() && periode === "toutes" && annonces.length > 0 ? (
          <>
            <Check className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
            <h2 className="text-base font-semibold">Tout est trié</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Aucune annonce en attente. Les nouveaux avis BOAMP arrivent chaque matin.
            </p>
          </>
        ) : (
          <>
            <Radar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="text-base font-semibold">Aucune annonce</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              {search.trim() || periode !== "toutes"
                ? "Aucune annonce ne correspond à votre recherche ou à la période choisie."
                : "Lancez la veille pour récupérer les avis BOAMP des 7 derniers jours correspondant à l'éclairage public, aux réseaux électriques, au CFO et à la VRD."}
            </p>
          </>
        )}
      </div>
    ) : null;

  return (
    <AppShell
      title="Veille AO"
      subtitle={`Collecte BOAMP · ${idfSeulement ? "IDF + 60 + 27" : "France entière"}`}
      titleIcon={Radar}
      back={{ to: "/appels-offres", label: "Appels d'offres" }}
      actions={
        <div className="flex items-center gap-2">
          {canEdit ? (
            <Button size="sm" onClick={lancerVeille} disabled={refresh.isPending}>
              {refresh.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Lancer la veille
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-2" aria-label="Plus d'actions">
                {rattraper.isPending || qualifier.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {canEdit ? (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Traitements
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onSelect={() => qualifierEnAttente()}
                    disabled={qualifier.isPending}
                  >
                    <Sparkles className="mr-2 h-4 w-4" /> Qualifier en attente
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={rattraper14} disabled={rattraper.isPending}>
                    <History className="mr-2 h-4 w-4" /> Rattraper 14 jours
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Périmètre de collecte
              </DropdownMenuLabel>
              {[
                { v: true, label: "IDF + Oise (60) + Eure (27)" },
                { v: false, label: "France entière" },
              ].map((p) => (
                <DropdownMenuItem key={p.label} onSelect={() => setIdfSeulement(p.v)}>
                  <MapPin className="mr-2 h-4 w-4" />
                  <span className="flex-1">{p.label}</span>
                  {idfSeulement === p.v ? <Check className="h-4 w-4" /> : null}
                </DropdownMenuItem>
              ))}
              {canEdit ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Réglages
                  </DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setProfilOuvert(true)}>
                    <SlidersHorizontal className="mr-2 h-4 w-4" /> Profil de qualification
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDestinatairesOuvert(true)}>
                    <Mail className="mr-2 h-4 w-4" /> Destinataires
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          {canEdit ? (
            <>
              <VeilleProfilDialog hideTrigger open={profilOuvert} onOpenChange={setProfilOuvert} />
              <VeilleRecipientsDialog
                hideTrigger
                open={destinatairesOuvert}
                onOpenChange={setDestinatairesOuvert}
              />
            </>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-3 lg:h-full">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:pb-0">
            {FILTRES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setFiltre(f.value);
                  setFiltreSuivi("aucun");
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  filtre === f.value && filtreSuivi === "aucun"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                <span className="ml-1.5 tabular-nums opacity-70">{counts[f.value] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher titre, acheteur, dép.…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 bg-background pl-9 pr-8"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filtreDecision} onValueChange={setFiltreDecision}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes décisions</SelectItem>
              <SelectItem value="prioritaire">Prioritaires</SelectItem>
              <SelectItem value="a_creuser">À creuser</SelectItem>
              <SelectItem value="hors_sujet">Hors sujet</SelectItem>
              <SelectItem value="a_qualifier">Non qualifiées</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtreEntite} onValueChange={setFiltreEntite}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes entités</SelectItem>
              <SelectItem value="MESELEC">MESELEC</SelectItem>
              <SelectItem value="MESTP">MESTP</SelectItem>
              <SelectItem value="aucune">Aucune</SelectItem>
            </SelectContent>
          </Select>
          <Popover open={periodeOuverte} onOpenChange={setPeriodeOuverte}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 text-xs font-normal",
                  periode !== "toutes" && "border-primary text-primary",
                )}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                {periode === "toutes"
                  ? "Parution : toutes dates"
                  : labelPeriode(periode, periodeDu, periodeAu)}
                {periode !== "toutes" ? (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Réinitialiser la période"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPeriode("toutes");
                    }}
                    className="-mr-1 rounded p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <p className="px-2 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">
                Date de parution
              </p>
              <div className="flex flex-col">
                {PERIODES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setPeriode(p.value);
                      if (p.value !== "perso") setPeriodeOuverte(false);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                      periode === p.value && "font-medium text-primary",
                    )}
                  >
                    {p.label}
                    {periode === p.value ? <Check className="h-4 w-4" /> : null}
                  </button>
                ))}
              </div>
              {periode === "perso" ? (
                <div className="mt-2 grid grid-cols-2 gap-2 border-t px-1 pt-2">
                  <label className="space-y-1 text-xs text-muted-foreground">
                    Du
                    <Input
                      type="date"
                      value={periodeDu}
                      max={periodeAu || undefined}
                      onChange={(e) => setPeriodeDu(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    Au
                    <Input
                      type="date"
                      value={periodeAu}
                      min={periodeDu || undefined}
                      onChange={(e) => setPeriodeAu(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </label>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={voirHorsSujet} onCheckedChange={setVoirHorsSujet} />
            Afficher les hors sujet ({horsSujetMasquees})
          </label>
          {filtreDecision !== "toutes" ||
          filtreEntite !== "toutes" ||
          periode !== "toutes" ||
          voirHorsSujet ||
          search.trim() ||
          filtreSuivi !== "aucun" ? (
            <button
              type="button"
              onClick={() => {
                setFiltreDecision("toutes");
                setFiltreEntite("toutes");
                setPeriode("toutes");
                setPeriodeDu("");
                setPeriodeAu("");
                setVoirHorsSujet(false);
                setSearch("");
                setFiltreSuivi("aucun");
              }}
              className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Réinitialiser les filtres
            </button>
          ) : null}
          {nbEnCours > 0 || filtreSuivi === "en_cours" ? (
            <button
              type="button"
              onClick={() => setFiltreSuivi(filtreSuivi === "en_cours" ? "aucun" : "en_cours")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                filtreSuivi === "en_cours"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary/40 bg-primary/10 text-primary",
              )}
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> En cours
              <span className="tabular-nums">{nbEnCours}</span>
            </button>
          ) : null}
          {nbARevoir > 0 || filtreSuivi === "a_revoir" ? (
            <button
              type="button"
              onClick={() => setFiltreSuivi(filtreSuivi === "a_revoir" ? "aucun" : "a_revoir")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                filtreSuivi === "a_revoir"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              )}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> À revoir
              <span className="tabular-nums">{nbARevoir}</span>
            </button>
          ) : null}
          {qualifier.data && !qualifier.data.ok && !qualifier.isPending ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Qualification IA indisponible :{" "}
              {qualifier.data.error}
            </span>
          ) : null}
          {qualifier.isPending ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Qualification IA en cours…
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col gap-2 lg:overflow-y-auto lg:pr-1">
              {listeVide}
              {items.map((a) => (
                <LigneAnnonce
                  key={a.id}
                  a={a}
                  active={large && courante?.id === a.id}
                  enCours={
                    qualifier.isPending && (a.qualif_statut ?? "a_qualifier") === "a_qualifier"
                  }
                  activites={activitesDe(a)}
                  marque={suivi.marques[a.id]}
                  refLigne={(el) => {
                    if (el) lignesRef.current.set(a.id, el);
                    else lignesRef.current.delete(a.id);
                  }}
                  onSelect={() => {
                    setSelectionId(a.id);
                    if (!large) setMobileOuvert(true);
                  }}
                />
              ))}
              {items.length > 0 && large ? (
                <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">
                  <kbd className="font-mono">J</kbd>/<kbd className="font-mono">K</kbd> naviguer ·{" "}
                  <kbd className="font-mono">E</kbd> envoyer vers les AO ·{" "}
                  <kbd className="font-mono">I</kbd> ignorer · <kbd className="font-mono">A</kbd>{" "}
                  analyser le DCE
                </p>
              ) : null}
            </div>
            {large ? (
              <div className="min-h-0 overflow-y-auto rounded-2xl border bg-card shadow-sm">
                {courante ? (
                  <PanneauAnnonce a={courante} canEdit={canEdit} actions={actions} />
                ) : (
                  <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
                    Sélectionnez une annonce
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
      <DialogueMotif
        annonce={motifPour}
        onFermer={() => setMotifPour(null)}
        onValider={(a, motif, note) => actions.confirmerIgnore(a, motif, note)}
      />
      {!large ? (
        <Sheet open={mobileOuvert && courante != null} onOpenChange={setMobileOuvert}>
          <SheetContent className="w-full overflow-y-auto overflow-x-hidden p-0 sm:max-w-xl">
            <SheetHeader className="sr-only">
              <SheetTitle>{courante?.intitule}</SheetTitle>
            </SheetHeader>
            {courante ? <PanneauAnnonce a={courante} canEdit={canEdit} actions={actions} /> : null}
          </SheetContent>
        </Sheet>
      ) : null}
    </AppShell>
  );
}
