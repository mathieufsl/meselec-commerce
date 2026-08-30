import type { ProspectionCrmHeaderStats } from "@/contexts/ProspectionCrmHeaderContext";
import { cn } from "@/lib/utils";

export function ProspectionCrmHeaderStatsBar({
  stats,
  className,
}: {
  stats: ProspectionCrmHeaderStats;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StatPill label="Communes" value={stats.communes} />
      <StatPill label="Ciblées" value={stats.cibles} className="text-warning" />
      <StatPill label="Non ciblées" value={stats.nonCiblees} />
    </div>
  );
}

function StatPill({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="min-w-[72px] rounded-lg border bg-card px-2.5 py-1.5 text-center">
      <div className={cn("text-base font-bold leading-tight tabular-nums", className)}>{value}</div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
