import { Badge } from "@/components/ui/badge";
import {
  CRM_CIBLE_COMMERCIAUX,
  crmCommercialTabBadgeClass,
  emptyCrmAssignmentFilter,
  isAllCrmAssignment,
  isCrmAssignmentTabSelected,
  toggleCrmAssignmentCommercial,
  toggleCrmAssignmentUnassigned,
  type CrmAssignmentFilter,
  type CrmCommercialTab,
  type CrmCibleCommercial,
} from "@/lib/prospection/crmUi";
import { cn } from "@/lib/utils";

export function ProspectionCrmAssignmentFilterMobile({
  filter,
  onChange,
  commercialCounts,
}: {
  filter: CrmAssignmentFilter;
  onChange: (filter: CrmAssignmentFilter) => void;
  commercialCounts: Record<CrmCommercialTab, number>;
}) {
  const toggleCommercial = (name: CrmCibleCommercial) => {
    onChange(toggleCrmAssignmentCommercial(filter, name));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Assignation</span>
        {!isAllCrmAssignment(filter) ? (
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => onChange(emptyCrmAssignmentFilter())}
          >
            Tout effacer
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <FilterChip
          label="Non assignées"
          count={commercialCounts.unassigned}
          selected={filter.unassigned}
          onClick={() => onChange(toggleCrmAssignmentUnassigned(filter))}
          badgeClass={crmCommercialTabBadgeClass("unassigned")}
        />
        {CRM_CIBLE_COMMERCIAUX.map((name) => (
          <FilterChip
            key={name}
            label={name}
            count={commercialCounts[name]}
            selected={filter.commercials.includes(name)}
            onClick={() => toggleCommercial(name)}
            badgeClass={crmCommercialTabBadgeClass(name)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  selected,
  onClick,
  badgeClass,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
  badgeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border/80 bg-background hover:bg-muted/50",
      )}
    >
      <span className="min-w-0 shrink-0">{label}</span>
      <Badge
        variant={selected ? "secondary" : "outline"}
        className={cn("shrink-0 tabular-nums", badgeClass)}
      >
        {count}
      </Badge>
    </button>
  );
}

/** Résumé compact pour l’icône filtres (badge). */
export function crmAssignmentFilterSummary(filter: CrmAssignmentFilter): string | null {
  if (isAllCrmAssignment(filter)) return null;
  const parts: string[] = [];
  if (filter.unassigned) parts.push("Non assignées");
  parts.push(...filter.commercials);
  return parts.join(", ");
}

export { isCrmAssignmentTabSelected };
