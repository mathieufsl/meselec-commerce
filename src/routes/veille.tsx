import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarRange,
  Check,
  Mail,
  MapPin,
  MoreHorizontal,
  SlidersHorizontal,
  ExternalLink,
  EyeOff,
  FileDown,
  History,
  Loader2,
  PanelRightOpen,
  RefreshCw,
  Send,
  Sparkles,
  Radar,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/commerce/AppShell";
import { VeilleAnalysePanel } from "@/components/commerce/VeilleAnalysePanel";
import { VeilleRecipientsDialog } from "@/components/commerce/VeilleRecipientsDialog";
import { VeilleProfilDialog } from "@/components/commerce/VeilleProfilDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AO_SECTEUR_LABELS, type AoSecteurCode } from "@/lib/commerceTypes";
import { VEILLE_STATUT_LABELS, type VeilleAnnonceRow, type VeilleStatut } from "@/lib/veille";
import { VEILLE_DECISION_LABELS, type VeilleDecision } from "@/lib/veilleQualif";
import {
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
  { value: "nouveau", label: "Nouveaux" },
  { value: "importe", label: "Importés" },
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

function ResumeIa({ id }: { id: string }) {
  const { data, isLoading } = useVeilleAvisComplet(id);
  const resumer = useResumerAvis();
  const resume = data?.avis_resume ?? null;
  // Le panneau garde ce composant d'une annonce à l'autre : on n'affiche l'état
  // (chargement, erreur) que s'il concerne l'annonce affichée.
  const pourCetteAnnonce = resumer.variables?.id === id;
  const enCours = resumer.isPending && pourCetteAnnonce;
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
            onClick={() => resumer.mutate({ id, force: true })}
          >
            <RefreshCw className={cn("mr-1 h-3 w-3", enCours && "animate-spin")} />
            Régénérer
          </Button>
        ) : null}
      </div>
      {enCours && !resume ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Lecture de l'avis par l'IA…
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
          <Button size="sm" variant="outline" onClick={() => resumer.mutate({ id })}>
            Réessayer
          </Button>
        </div>
      ) : !isLoading && !data?.raw ? (
        <p className="text-xs text-muted-foreground">Texte de l'avis non disponible.</p>
      ) : (
        <Button size="sm" variant="outline" onClick={() => resumer.mutate({ id })}>
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

function DetailAnnonce({ a }: { a: VeilleAnnonceRow }) {
  const ex = a.exigences ?? {};
  const lignes: Array<[string, string | null | undefined]> = [
    ["Entité", a.entite],
    ["Type de marché", a.type_marche],
    ["Montant estimé", ex.montant_estime],
    ["Durée", ex.duree],
    ["Allotissement", ex.allotissement],
    ["CA minimum", ex.chiffre_affaires_min],
    ["Références", ex.references],
    [
      "Visite obligatoire",
      ex.visite_obligatoire == null ? null : ex.visite_obligatoire ? "Oui" : "Non",
    ],
    ["Date de visite", ex.date_visite],
    ["Certifications exigées", ex.certifications?.length ? ex.certifications.join(", ") : null],
    ["Plateforme", a.plateforme],
    ["CPV", a.cpv],
    ["Modèle", a.qualif_model],
  ];
  return (
    <div className="min-w-0 space-y-4 px-4 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <DecisionBadge a={a} />
        {badgesAnnonce(a).map((b) => (
          <span
            key={b}
            className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          >
            {b}
          </span>
        ))}
      </div>
      {a.qualif_error ? (
        <p className="rounded bg-destructive/10 p-2 text-xs text-destructive">{a.qualif_error}</p>
      ) : null}
      <ResumeIa id={a.id} />
      {a.resume ? (
        <p className="text-sm">
          <span className="font-medium">Avis de qualification : </span>
          {a.resume}
        </p>
      ) : null}
      <ListeDetail titre="Raisons" items={a.raisons} />
      <ListeDetail titre="Points rouges" items={a.points_rouges} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {lignes
          .filter(([, v]) => v)
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
      <div className="flex flex-wrap gap-2">
        {(a.dce_url ?? a.url_dce) ? (
          <Button size="sm" asChild>
            <a href={(a.dce_url ?? a.url_dce) as string} target="_blank" rel="noreferrer">
              <FileDown className="mr-1.5 h-4 w-4" /> DCE
            </a>
          </Button>
        ) : null}
        {a.lien ? (
          <Button size="sm" variant="outline" asChild>
            <a href={a.lien} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" /> Annonce BOAMP
            </a>
          </Button>
        ) : null}
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

function VeillePage() {
  const navigate = useNavigate();
  const { hasEditorAccess } = useCommerceAuth();
  const canEdit = hasEditorAccess("appels_offres");
  const [filtre, setFiltre] = useState<VeilleStatut | "tous">("nouveau");
  const [idfSeulement, setIdfSeulement] = useState(true);
  const [search, setSearch] = useState("");
  const [voirHorsSujet, setVoirHorsSujet] = useState(false);
  const [filtreEntite, setFiltreEntite] = useState<string>("toutes");
  const [filtreDecision, setFiltreDecision] = useState<string>("toutes");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [periode, setPeriode] = useState<Periode>("toutes");
  const [periodeDu, setPeriodeDu] = useState("");
  const [periodeAu, setPeriodeAu] = useState("");
  const [periodeOuverte, setPeriodeOuverte] = useState(false);
  const [profilOuvert, setProfilOuvert] = useState(false);
  const [destinatairesOuvert, setDestinatairesOuvert] = useState(false);
  const qualifier = useQualifierVeille();
  const rattraper = useRattraperVeille();
  const { data: annonces = [], isLoading } = useVeilleAnnonces();
  const refresh = useRefreshVeille();
  const setStatut = useSetVeilleStatut();
  const importAo = useImportVeilleToAo();

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

  const items = useMemo(() => {
    const list = filtre === "tous" ? matching : matching.filter((a) => a.statut === filtre);
    // Les annonces qualifiées remontent par score décroissant, les autres gardent l'ordre de parution.
    return [...list].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [matching, filtre]);
  const detail = annonces.find((a) => a.id === detailId) ?? null;

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

  function qualifierEnAttente() {
    qualifier.mutate(
      { limit: 100 },
      {
        onSuccess: toastQualif,
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Échec"),
      },
    );
  }

  function requalifier(id: string) {
    qualifier.mutate(
      { ids: [id] },
      {
        onSuccess: toastQualif,
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Échec"),
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
        },
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : "Échec de la collecte"),
      },
    );
  }

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
                  <DropdownMenuItem onSelect={qualifierEnAttente} disabled={qualifier.isPending}>
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
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:pb-0">
            {FILTRES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFiltre(f.value)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  filtre === f.value
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
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
            <Radar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="text-base font-semibold">Aucune annonce</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              {search.trim() || periode !== "toutes"
                ? "Aucune annonce ne correspond à votre recherche ou à la période choisie."
                : "Lancez la veille pour récupérer les avis BOAMP des 7 derniers jours correspondant à l'éclairage public, aux réseaux électriques, au CFO et à la VRD."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((a) => (
              <li key={a.id} className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {a.intitule}
                    </p>
                    {a.acheteur ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.acheteur}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <DecisionBadge a={a} />
                    <Badge variant={a.statut === "nouveau" ? "default" : "secondary"}>
                      {VEILLE_STATUT_LABELS[a.statut]}
                    </Badge>
                  </div>
                </div>

                {a.resume ? (
                  <p className="mt-2 text-sm leading-snug text-foreground/80">{a.resume}</p>
                ) : null}
                {badgesAnnonce(a).length > 0 || (a.entite && a.entite !== "aucune") ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.entite && a.entite !== "aucune" ? (
                      <span className="rounded border px-1.5 py-0.5 text-xs font-medium">
                        {a.entite}
                      </span>
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
                ) : null}

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {(a.secteurs as AoSecteurCode[]).map((s) => (
                    <span
                      key={s}
                      className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary"
                    >
                      {AO_SECTEUR_LABELS[s] ?? s}
                    </span>
                  ))}
                  {a.departement ? <span>Dép. {a.departement}</span> : null}
                  <span className="tabular-nums">Paru {formatDate(a.date_parution)}</span>
                  <span className="tabular-nums">Limite {formatDate(a.date_limite)}</span>
                  <span>{a.source}</span>
                  {a.plateforme && a.plateforme !== "inconnue" ? <span>{a.plateforme}</span> : null}
                </div>

                <VeilleAnalysePanel annonce={a} canEdit={canEdit} />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canEdit ? (
                    <Button
                      size="sm"
                      disabled={a.statut === "importe" || importAo.isPending}
                      onClick={() =>
                        importAo.mutate(a, {
                          onSuccess: () => toast.success("Appel d'offres créé dans les AO"),
                          onError: (e: unknown) =>
                            toast.error(e instanceof Error ? e.message : "Échec de l'import"),
                        })
                      }
                    >
                      <Send className="mr-1.5 h-4 w-4" />
                      {a.statut === "importe" ? "Déjà dans les AO" : "Envoyer vers les AO"}
                    </Button>
                  ) : null}
                  {a.statut === "importe" && a.ao_id ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void navigate({
                          to: "/appels-offres/$aoId",
                          params: { aoId: a.ao_id as string },
                        })
                      }
                    >
                      Ouvrir l&apos;AO
                    </Button>
                  ) : null}
                  {(a.dce_url ?? a.url_dce) ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={(a.dce_url ?? a.url_dce) as string} target="_blank" rel="noreferrer">
                        <FileDown className="mr-1.5 h-4 w-4" />
                        DCE
                      </a>
                    </Button>
                  ) : null}
                  {a.lien ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={a.lien} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1.5 h-4 w-4" />
                        Annonce
                      </a>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => setDetailId(a.id)}>
                    <PanelRightOpen className="mr-1.5 h-4 w-4" />
                    Détail
                  </Button>
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={qualifier.isPending}
                      onClick={() => requalifier(a.id)}
                    >
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      {a.qualif_statut === "qualifie" ? "Requalifier" : "Qualifier"}
                    </Button>
                  ) : null}
                  {canEdit && a.statut !== "importe" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setStatut.mutate({
                          id: a.id,
                          statut: a.statut === "ignore" ? "nouveau" : "ignore",
                        })
                      }
                    >
                      <EyeOff className="mr-1.5 h-4 w-4" />
                      {a.statut === "ignore" ? "Restaurer" : "Ignorer"}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Sheet open={detail != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="w-full overflow-y-auto overflow-x-hidden sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="pr-6 text-base leading-snug">{detail?.intitule}</SheetTitle>
            {detail?.acheteur ? (
              <p className="text-sm text-muted-foreground">{detail.acheteur}</p>
            ) : null}
          </SheetHeader>
          {detail ? <DetailAnnonce a={detail} /> : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
