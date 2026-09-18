import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExternalLink, EyeOff, Loader2, RefreshCw, Send, Radar } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/commerce/AppShell";
import { VeilleRecipientsDialog } from "@/components/commerce/VeilleRecipientsDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AO_SECTEUR_LABELS, type AoSecteurCode } from "@/lib/commerceTypes";
import { VEILLE_STATUT_LABELS, type VeilleStatut } from "@/lib/veille";
import {
  useImportVeilleToAo,
  useRefreshVeille,
  useSetVeilleStatut,
  useVeilleAnnonces,
} from "@/hooks/useVeille";
import { useCommerceAuth } from "@/hooks/useCommerceAuth";

export const Route = createFileRoute("/veille")({
  head: () => ({
    meta: [
      { title: "Veille appels d'offres — Meselec Commerce" },
      {
        name: "description",
        content:
          "Annonces d'appels d'offres publics collectées automatiquement (BOAMP), filtrées sur l'éclairage public, les réseaux électriques, le CFO et la VRD en Île-de-France.",
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

function VeillePage() {
  const navigate = useNavigate();
  const { hasEditorAccess } = useCommerceAuth();
  const canEdit = hasEditorAccess("appels_offres");
  const [filtre, setFiltre] = useState<VeilleStatut | "tous">("nouveau");
  const [idfSeulement, setIdfSeulement] = useState(true);
  const { data: annonces = [], isLoading } = useVeilleAnnonces();
  const refresh = useRefreshVeille();
  const setStatut = useSetVeilleStatut();
  const importAo = useImportVeilleToAo();

  const counts = useMemo(() => {
    const c: Record<string, number> = { tous: annonces.length };
    for (const a of annonces) c[a.statut] = (c[a.statut] ?? 0) + 1;
    return c;
  }, [annonces]);

  const items = useMemo(
    () => (filtre === "tous" ? annonces : annonces.filter((a) => a.statut === filtre)),
    [annonces, filtre],
  );

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
      subtitle="Collecte BOAMP filtrée sur votre périmètre"
      titleIcon={Radar}
      actions={
        <div className="flex items-center gap-2">
          {canEdit ? <VeilleRecipientsDialog /> : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIdfSeulement((v) => !v)}
            className="whitespace-nowrap"
          >
            {idfSeulement ? "Île-de-France" : "France entière"}
          </Button>
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
        </div>
      }
    >
      <div className="space-y-4">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
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

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
            <Radar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="text-base font-semibold">Aucune annonce</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Lancez la veille pour récupérer les avis BOAMP des 7 derniers jours correspondant à
              l&apos;éclairage public, aux réseaux électriques, au CFO et à la VRD.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {a.intitule}
                    </p>
                    {a.acheteur ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.acheteur}</p>
                    ) : null}
                  </div>
                  <Badge variant={a.statut === "nouveau" ? "default" : "secondary"}>
                    {VEILLE_STATUT_LABELS[a.statut]}
                  </Badge>
                </div>

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
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canEdit ? (
                    <Button
                      size="sm"
                      disabled={a.statut === "importe" || importAo.isPending}
                      onClick={() =>
                        importAo.mutate(a, {
                          onSuccess: () =>
                            toast.success("Appel d'offres créé dans les AO"),
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
                  {a.lien ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={a.lien} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1.5 h-4 w-4" />
                        Annonce
                      </a>
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
    </AppShell>
  );
}
