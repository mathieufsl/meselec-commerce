import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/commerce/AppShell";
import { CommerceKpiBrick } from "@/components/commerce/CommerceKpiBrick";
import { CommerceQuickAction } from "@/components/commerce/CommerceQuickAction";
import { useAppelsOffres, useCommerceSettings } from "@/hooks/useCommerceData";
import { daysUntil, formatEuro } from "@/lib/bpuEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addDays,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  Briefcase,
  BookOpen,
  MapPin,
  Settings,
  ChevronRight,
  CalendarDays,
  Target,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

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
  const enCours = aos.filter((a) => ["analyse", "en_cours"].includes(a.statut));
  const montantPipeline = actifs.reduce((s, a) => s + (a.montant_estime ?? 0), 0);
  const gagnes = aos.filter((a) => a.statut === "gagne");

  const syncLabel = settings?.last_erp_sync_at
    ? new Date(settings.last_erp_sync_at).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const todoItems = [
    urgents.length > 0
      ? { label: "AO à déposer bientôt", value: urgents.length, href: "/appels-offres" }
      : null,
    enCours.length > 0
      ? { label: "En analyse / en cours", value: enCours.length, href: "/appels-offres" }
      : null,
    gagnes.length > 0
      ? { label: "Marchés gagnés", value: gagnes.length, href: "/appels-offres" }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: number; href: string }>;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const planningDates = [0, 1, 2].map((offset) =>
    format(addDays(weekStart, offset), "yyyy-MM-dd"),
  );

  const echeancesByDate = planningDates.reduce<Record<string, typeof urgents>>((acc, dateKey) => {
    acc[dateKey] = urgents.filter((ao) => {
      if (!ao.date_limite_depot) return false;
      return ao.date_limite_depot.slice(0, 10) === dateKey;
    });
    return acc;
  }, {});

  const echeancesSemaine = urgents.filter((ao) => {
    if (!ao.date_limite_depot) return false;
    const d = ao.date_limite_depot.slice(0, 10);
    return planningDates.includes(d);
  });

  return (
    <AppShell title="Vue d'ensemble" subtitle="Pôle commerce mutualisé" syncLabel={syncLabel}>
      <div className="space-y-8 pb-12">
        <div className="grid items-stretch gap-4 lg:grid-cols-[1.25fr_0.9fr_320px]">
          <div className="min-h-[170px] space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Bonjour</h2>
              <p className="text-sm text-muted-foreground">Votre semaine et vos accès rapides.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CommerceQuickAction to="/appels-offres" label="Nouvel AO" icon={Briefcase} />
              <CommerceQuickAction to="/catalogues" label="Catalogues" icon={BookOpen} />
              <CommerceQuickAction to="/prospection" label="Prospection" icon={MapPin} />
              <CommerceQuickAction to="/admin" label="Paramètres" icon={Settings} dashed />
            </div>
          </div>

          <Card className="flex h-full min-h-[170px] w-full min-w-0 flex-col border shadow-sm">
            <CardHeader className="shrink-0 pb-1.5 pt-4">
              <CardTitle className="text-base font-semibold">Indicateurs clés</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-2 pb-4 pt-0">
              <div className="flex min-h-0 flex-1 flex-col justify-center">
                <CommerceKpiBrick
                  title="Pipeline actif"
                  value={`${actifs.length} AO`}
                  icon={Target}
                  href="/appels-offres"
                  variant="positive"
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col justify-center">
                <CommerceKpiBrick
                  title="Montant estimé"
                  value={`${formatEuro(montantPipeline, 0)} HT`}
                  icon={TrendingUp}
                  href="/appels-offres"
                  variant="neutral"
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col justify-center">
                <CommerceKpiBrick
                  title="Échéances < 14j"
                  value={String(urgents.length)}
                  icon={AlertTriangle}
                  href="/appels-offres"
                  variant="alert"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="h-full min-h-[170px] border shadow-sm">
            <CardHeader className="pb-1.5 pt-4">
              <CardTitle className="text-base font-semibold">À faire</CardTitle>
              <p className="text-sm text-muted-foreground">Points d&apos;attention du jour</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {todoItems.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Vous êtes à jour.
                </div>
              ) : (
                todoItems.slice(0, 3).map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 transition-colors hover:bg-muted/40"
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                      {item.value}
                    </span>
                  </Link>
                ))
              )}
              <Button variant="ghost" size="sm" className="w-full justify-between" asChild>
                <Link to="/appels-offres">
                  Voir tout
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border bg-gradient-to-br from-card to-muted/20 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Échéances de la semaine
                </CardTitle>
                <p className="text-sm text-muted-foreground">Dépôts AO à venir</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/appels-offres">
                  Ouvrir
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {echeancesSemaine.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune échéance proche.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-3">
                {planningDates.map((dateKey) => (
                  <div key={dateKey} className="space-y-2 rounded-xl border bg-background/70 p-2.5">
                    <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {format(parseISO(dateKey), "EEE d MMM", { locale: fr })}
                    </p>
                    <div className="space-y-2">
                      {(echeancesByDate[dateKey] ?? []).slice(0, 4).map((ao) => (
                        <Link
                          key={ao.id}
                          to="/appels-offres/$aoId"
                          params={{ aoId: ao.id }}
                          className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {ao.clients?.nom_entreprise ?? ao.reference}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[ao.reference, ao.titre].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      ))}
                      {(echeancesByDate[dateKey] ?? []).length === 0 && (
                        <div className="rounded-lg border border-dashed bg-card px-3 py-4 text-center text-xs text-muted-foreground">
                          Aucun dépôt prévu
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}
