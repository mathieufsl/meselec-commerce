import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, KpiStrip, Panel, StatusBadge } from "@/components/commerce/AppShell";
import {
  useAppelsOffres,
  useCommerceSettings,
  useSocietes,
} from "@/hooks/useCommerceData";
import {
  AO_PIPELINE_COLUMNS,
  AO_STATUT_LABELS,
  type AoStatut,
} from "@/lib/commerceTypes";
import { daysUntil, formatEuro } from "@/lib/bpuEngine";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: aos = [] } = useAppelsOffres();
  const { data: settings } = useCommerceSettings();
  const { data: societes = [] } = useSocietes();

  const actifs = aos.filter((a) => !["gagne", "perdu", "abandonne"].includes(a.statut));
  const urgents = actifs.filter((a) => {
    const d = daysUntil(a.date_limite_depot);
    return d != null && d >= 0 && d <= 14;
  });
  const montantPipeline = actifs.reduce((s, a) => s + (a.montant_estime ?? 0), 0);

  const syncLabel = settings?.last_erp_sync_at
    ? new Date(settings.last_erp_sync_at).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <AppShell title="Pipeline commercial" subtitle="Appels d'offres mutualisés" syncLabel={syncLabel}>
      <section className="relative overflow-hidden rounded-2xl border border-[var(--commerce-border)] bg-[var(--commerce-ink)] text-white shadow-[var(--commerce-shadow)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_280px_at_10%_-20%,rgba(234,88,12,0.35),transparent_55%),radial-gradient(600px_240px_at_90%_0%,rgba(30,64,175,0.45),transparent_50%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 px-5 py-6 md:px-7 md:py-7">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--commerce-accent)]">
              Pôle commerce
            </p>
            <h2
              className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.035em] md:text-[34px]"
              style={{ fontFamily: "var(--commerce-display)" }}
            >
              Suivi des marchés
            </h2>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/65">
              AO, catalogues BPU/DPGF, mémoires techniques — attribution vers{" "}
              {societes.map((s) => s.code).join(", ") || "les sociétés d'exploitation"}.
            </p>
          </div>
          <Link
            to="/appels-offres"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-[12px] font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
          >
            Voir tous les AO
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <KpiStrip
        className="mt-4"
        items={[
          { label: "AO actifs", value: String(actifs.length) },
          { label: "Échéance < 14j", value: String(urgents.length), tone: urgents.length ? "warn" : "default" },
          { label: "Montant pipeline", value: formatEuro(montantPipeline, 0) },
          { label: "Gagnés", value: String(aos.filter((a) => a.statut === "gagne").length), tone: "good" },
        ]}
      />

      <Panel title="Pipeline kanban" className="mt-4" bodyClassName="p-3">
        <div className="grid gap-3 lg:grid-cols-5">
          {AO_PIPELINE_COLUMNS.map((statut) => {
            const column = aos.filter((a) => a.statut === statut);
            return (
              <div key={statut} className="min-w-0 rounded-lg bg-[var(--commerce-row)] p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--commerce-muted)]">
                    {AO_STATUT_LABELS[statut]}
                  </p>
                  <span className="text-[10px] font-semibold text-[var(--commerce-muted)]">
                    {column.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {column.slice(0, 8).map((ao) => (
                    <Link
                      key={ao.id}
                      to="/appels-offres/$aoId"
                      params={{ aoId: ao.id }}
                      className="block rounded-md border border-[var(--commerce-border)] bg-[var(--commerce-panel)] p-2.5 text-[11px] shadow-sm transition hover:border-[var(--commerce-accent)]/40"
                    >
                      <p className="font-semibold text-[var(--commerce-ink)]">{ao.reference}</p>
                      <p className="mt-0.5 line-clamp-2 text-[var(--commerce-muted)]">{ao.titre}</p>
                      {ao.date_limite_depot ? (
                        <p
                          className={cn(
                            "mt-1.5 text-[10px]",
                            (daysUntil(ao.date_limite_depot) ?? 99) <= 7 && "text-[var(--commerce-warn)]",
                          )}
                        >
                          Limite {new Date(ao.date_limite_depot).toLocaleDateString("fr-FR")}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {urgents.length > 0 ? (
        <Panel title="Échéances proches" className="mt-4">
          <div className="space-y-2">
            {urgents.map((ao) => (
              <Link
                key={ao.id}
                to="/appels-offres/$aoId"
                params={{ aoId: ao.id }}
                className="flex items-center justify-between rounded-md border border-[var(--commerce-border)] px-3 py-2 text-sm hover:bg-[var(--commerce-row)]"
              >
                <span>
                  <strong>{ao.reference}</strong> — {ao.titre}
                </span>
                <StatusBadge statut={ao.statut} labels={AO_STATUT_LABELS as Record<string, string>} />
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}
