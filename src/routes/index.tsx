import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/commerce/AppShell";
import { CommerceKpiBar } from "@/components/commerce/CommerceKpiBar";
import {
  useAppelsOffres,
  useCommerceSettings,
} from "@/hooks/useCommerceData";
import { daysUntil, formatEuro } from "@/lib/bpuEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, BookOpen, MapPin, Settings, ChevronRight, Plus } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: aos = [] } = useAppelsOffres();
  const { data: settings } = useCommerceSettings();

  const actifs = aos.filter((a) => !["gagne", "perdu", "abandonne"].includes(a.statut));
  const urgents = actifs.filter((a) => {
    const d = daysUntil(a.date_limite_depot);
    return d != null && d >= 0 && d <= 14;
  });
  const montantPipeline = actifs.reduce((s, a) => s + (a.montant_estime ?? 0), 0);
  const gagnes = aos.filter((a) => a.statut === "gagne");
  const montantGagne = gagnes.reduce((s, a) => s + (a.montant_estime ?? 0), 0);

  const syncLabel = settings?.last_erp_sync_at
    ? new Date(settings.last_erp_sync_at).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const quickLinks = [
    { to: "/appels-offres", label: "Nouvel AO", icon: Plus, primary: true },
    { to: "/catalogues", label: "Catalogues", icon: BookOpen },
    { to: "/prospection", label: "Prospection", icon: MapPin },
    { to: "/admin", label: "Paramètres", icon: Settings, dashed: true },
  ] as const;

  return (
    <AppShell title="Vue d'ensemble" subtitle="Pôle commerce mutualisé" syncLabel={syncLabel}>
      <div className="grid gap-3 pt-1 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bonjour</CardTitle>
            <p className="text-xs text-muted-foreground">Vos accès rapides commerce.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Button
                  key={link.to}
                  variant={link.primary ? "default" : "outline"}
                  className={link.dashed ? "border-dashed" : ""}
                  asChild
                >
                  <Link to={link.to} className="gap-2">
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Indicateurs clés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <span className="text-xs text-muted-foreground">Pipeline actif</span>
              <span className="text-sm font-bold tabular-nums text-emerald-600">
                {actifs.length} AO
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-sky-500/20 bg-sky-500/5 px-3 py-2">
              <span className="text-xs text-muted-foreground">Montant estimé</span>
              <span className="text-sm font-bold tabular-nums text-sky-600">
                {formatEuro(montantPipeline, 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <span className="text-xs text-muted-foreground">Échéances &lt; 14j</span>
              <span className="text-sm font-bold tabular-nums text-amber-600">{urgents.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">À faire</CardTitle>
            <p className="text-xs text-muted-foreground">Points d&apos;attention du jour</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>AO à déposer bientôt</span>
              <Badge variant="secondary">{urgents.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>En analyse / en cours</span>
              <Badge variant="secondary">
                {aos.filter((a) => ["analyse", "en_cours"].includes(a.statut)).length}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Marchés gagnés</span>
              <Badge variant="secondary">{gagnes.length}</Badge>
            </div>
            <Button variant="link" className="h-auto p-0 text-xs" asChild>
              <Link to="/appels-offres">
                Voir tout <ChevronRight className="ml-0.5 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-3">
        <CommerceKpiBar
          pipelineCount={actifs.length}
          montantPipeline={montantPipeline}
          gagnesCount={gagnes.length}
          montantGagne={montantGagne}
          active={null}
          onToggle={() => undefined}
        />
      </div>

      <Panel title="Échéances de la semaine" className="mt-3">
        {urgents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune échéance proche.</p>
        ) : (
          <div className="space-y-2">
            {urgents.slice(0, 8).map((ao) => (
              <Link
                key={ao.id}
                to="/appels-offres/$aoId"
                params={{ aoId: ao.id }}
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{ao.reference}</p>
                  <p className="truncate text-xs text-muted-foreground">{ao.titre}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-amber-600">
                    {ao.date_limite_depot
                      ? new Date(ao.date_limite_depot).toLocaleDateString("fr-FR")
                      : "—"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <div className="mt-3 flex justify-end">
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link to="/appels-offres">
            <Briefcase className="h-4 w-4" />
            Ouvrir les appels d&apos;offres
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}
