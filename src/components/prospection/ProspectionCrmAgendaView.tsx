import { useMemo, useState } from "react";
import type { CrmCommune } from "@/data/crmCommunes";
import type { CrmCommuneState } from "@/lib/prospection/crmApi";
import {
  buildBarSegmentForYear,
  buildCrmAgendaEntries,
  buildYearMonthLabels,
  crmAgendaCommercialLabel,
  datePercentInYear,
  entryOverlapsYear,
  formatCrmAgendaDate,
  type CrmAgendaEntry,
  type CrmAgendaMonthLabel,
} from "@/lib/prospection/crmAgenda";
import { aggloBadgeClass } from "@/lib/prospection/ui";
import { departementShortLabel } from "@/lib/prospection/crmUi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  communes: CrmCommune[];
  getRow: (commune: CrmCommune) => CrmCommuneState;
  dirtyKeys: Set<string>;
  onOpenDetail: (commune: CrmCommune) => void;
};

export function ProspectionCrmAgendaView({ communes, getRow, dirtyKeys, onOpenDetail }: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const allEntries = useMemo(() => buildCrmAgendaEntries(communes, getRow), [communes, getRow]);
  const yearEntries = useMemo(
    () => allEntries.filter((entry) => entryOverlapsYear(entry, year)),
    [allEntries, year],
  );
  const monthLabels = useMemo(() => buildYearMonthLabels(year), [year]);

  const stats = useMemo(() => {
    let expiringSoon = 0;
    let expired = 0;
    for (const entry of yearEntries) {
      if (entry.isExpired) expired += 1;
      else if (entry.expiresWithin6Months) expiringSoon += 1;
    }
    return { total: yearEntries.length, expiringSoon, expired };
  }, [yearEntries]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear - 1, currentYear, currentYear + 1]);
    for (const entry of allEntries) {
      if (entry.attribution) years.add(entry.attribution.getFullYear());
      if (entry.expiration) years.add(entry.expiration.getFullYear());
    }
    return [...years].sort((a, b) => a - b);
  }, [allEntries, currentYear]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b bg-muted/30 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Année précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[5.5rem] text-center">
              <div className="text-lg font-semibold tabular-nums leading-none">{year}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Année</div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setYear((y) => y + 1)}
              aria-label="Année suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {availableYears.length > 0 ? (
              <div className="ml-1 flex flex-wrap gap-1">
                {availableYears.map((y) => (
                  <Button
                    key={y}
                    type="button"
                    variant={y === year ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs tabular-nums"
                    onClick={() => setYear(y)}
                  >
                    {y}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StatPill icon={CalendarRange} label="Marchés" value={stats.total} />
            <StatPill
              icon={AlertTriangle}
              label="Expirent < 6 mois"
              value={stats.expiringSoon}
              className="border-warning/30 bg-warning-subtle text-warning"
            />
            {stats.expired > 0 ? (
              <StatPill label="Expirés" value={stats.expired} className="border-error/30 bg-error-subtle text-error" />
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-full bg-primary/80" />
            Période du marché
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success ring-2 ring-success/30" />
            Attribution
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30" />
            Expiration
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
        {yearEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <CalendarRange className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucun marché daté pour {year}.</p>
            <p className="text-xs text-muted-foreground">
              Renseignez les dates dans le détail d&apos;une commune ou changez d&apos;année.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="sticky top-0 z-10 grid grid-cols-[minmax(220px,28%)_1fr] border-b bg-background/95 pb-2 backdrop-blur-sm">
                <div className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Commune
                </div>
                <div className="relative h-8 border-l">
                  {monthLabels.map((month) => (
                    <div
                      key={month.key}
                      className="absolute top-0 border-l border-border/60 pl-1 text-[10px] font-medium uppercase text-muted-foreground first:border-l-0"
                      style={{ left: `${month.leftPercent}%` }}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="divide-y">
                {yearEntries.map((entry) => (
                  <AgendaRow
                    key={entry.commune.key}
                    entry={entry}
                    year={year}
                    monthLabels={monthLabels}
                    isDirty={dirtyKeys.has(entry.commune.key)}
                    onOpenDetail={onOpenDetail}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  className,
  icon: Icon,
}: {
  label: string;
  value: number;
  className?: string;
  icon?: typeof CalendarRange;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5", className)}>
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" /> : null}
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function AgendaRow({
  entry,
  year,
  monthLabels,
  isDirty,
  onOpenDetail,
}: {
  entry: CrmAgendaEntry;
  year: number;
  monthLabels: CrmAgendaMonthLabel[];
  isDirty: boolean;
  onOpenDetail: (commune: CrmCommune) => void;
}) {
  const bar = buildBarSegmentForYear(entry, year);
  const { commune, row, attribution, expiration, expiresWithin6Months, isExpired } = entry;

  return (
    <button
      type="button"
      onClick={() => onOpenDetail(commune)}
      className={cn(
        "grid w-full grid-cols-[minmax(220px,28%)_1fr] gap-0 text-left transition-colors hover:bg-muted/40",
        isDirty && "bg-primary/5 ring-1 ring-inset ring-primary/20",
        isExpired && "opacity-75",
      )}
    >
      <div className="px-2 py-3 pr-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {departementShortLabel(commune.departement)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight">{commune.ville}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {commune.agglo ? (
                <span
                  className={cn(
                    "max-w-full truncate rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    aggloBadgeClass(commune.agglo),
                  )}
                >
                  {commune.agglo}
                </span>
              ) : null}
              <span className="text-[10px] text-muted-foreground">{crmAgendaCommercialLabel(row)}</span>
            </div>
            <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
              {row.prestataire ? (
                <div className="truncate">
                  <span className="font-medium text-foreground">{row.prestataire}</span>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                <span>
                  <span className="text-success">Attr.</span> {formatCrmAgendaDate(attribution)}
                </span>
                <span>
                  <span className="text-[var(--color-accent)]">Exp.</span> {formatCrmAgendaDate(expiration)}
                </span>
              </div>
              {row.dureeMarche ? (
                <div className="text-[10px]">Durée : {row.dureeMarche}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-l py-3 pr-2">
        <div className="relative mx-2 h-10 rounded-md bg-muted/50">
          {monthLabels.map((month) => (
            <div
              key={month.key}
              className="absolute inset-y-0 border-l border-border/40 first:border-l-0"
              style={{ left: `${month.leftPercent}%` }}
            />
          ))}

          {bar ? (
            <div
              className={cn(
                "absolute top-1/2 h-3 -translate-y-1/2 rounded-full",
                isExpired
                  ? "bg-muted-foreground/35"
                  : expiresWithin6Months
                    ? "bg-warning/90"
                    : "bg-primary/80",
              )}
              style={{ left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%` }}
            />
          ) : null}

          {attribution ? (
            <DateMarker
              date={attribution}
              year={year}
              className="bg-success ring-success/30"
              title={`Attribution · ${formatCrmAgendaDate(attribution)}`}
            />
          ) : null}

          {expiration ? (
            <DateMarker
              date={expiration}
              year={year}
              className={cn(
                "ring-[var(--color-accent)]/30",
                isExpired ? "bg-error" : expiresWithin6Months ? "bg-warning" : "bg-[var(--color-accent)]",
              )}
              title={`Expiration · ${formatCrmAgendaDate(expiration)}`}
            />
          ) : null}
        </div>
      </div>
    </button>
  );
}

function DateMarker({
  date,
  year,
  className,
  title,
}: {
  date: Date;
  year: number;
  className?: string;
  title: string;
}) {
  const left = datePercentInYear(date, year);
  if (left < 0 || left > 100) return null;

  return (
    <span
      className={cn("absolute top-1/2 z-[1] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2", className)}
      style={{ left: `${left}%` }}
      title={title}
    />
  );
}
