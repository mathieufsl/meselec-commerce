export const CRM_CIBLE_COMMERCIAUX = ["Rida", "Arnaud", "Cisse", "Mohammed", "Mathieu"] as const;

export type CrmCibleCommercial = (typeof CRM_CIBLE_COMMERCIAUX)[number];

/** Normalise les valeurs legacy (ex. « cible mathieu » → Mathieu). */
export function normalizeQuiCible(raw: string): CrmCibleCommercial | "" {
  const t = raw.trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  for (const name of CRM_CIBLE_COMMERCIAUX) {
    if (lower === name.toLowerCase() || lower.includes(name.toLowerCase())) {
      return name;
    }
  }
  return "";
}

export function quiCibleSelectClass(quiCible: string) {
  return normalizeQuiCible(quiCible)
    ? "border-warning/40 bg-warning-subtle font-semibold text-warning"
    : "";
}

export function nuanceBadgeClass(nuance: string) {
  switch (nuance) {
    case "LDVD":
      return "bg-info-subtle text-info";
    case "LDVG":
      return "bg-primary/10 text-primary";
    case "LSOC":
      return "bg-error-subtle text-error";
    case "LDIV":
      return "bg-accent-subtle text-[var(--color-accent)]";
    case "UG":
      return "bg-primary/15 text-primary";
    case "SE":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function departementShortLabel(departement: string) {
  const m = departement.match(/\((\d+)\)/);
  return m ? m[1] : departement;
}

export type CrmCommercialTab = "all" | "unassigned" | CrmCibleCommercial;

export type CrmAssignmentFilter = {
  unassigned: boolean;
  commercials: CrmCibleCommercial[];
};

export function emptyCrmAssignmentFilter(): CrmAssignmentFilter {
  return { unassigned: false, commercials: [] };
}

export function isAllCrmAssignment(filter: CrmAssignmentFilter): boolean {
  return !filter.unassigned && filter.commercials.length === 0;
}

export function crmAssignmentFromTab(tab: CrmCommercialTab): CrmAssignmentFilter {
  if (tab === "all") return emptyCrmAssignmentFilter();
  if (tab === "unassigned") return { unassigned: true, commercials: [] };
  return { unassigned: false, commercials: [tab] };
}

export function isCrmAssignmentTabSelected(filter: CrmAssignmentFilter, tab: CrmCommercialTab): boolean {
  if (tab === "all") return isAllCrmAssignment(filter);
  if (tab === "unassigned") return filter.unassigned && filter.commercials.length === 0;
  return !filter.unassigned && filter.commercials.length === 1 && filter.commercials[0] === tab;
}

/** Depuis « Tous », un clic sélectionne uniquement ce prénom ; ensuite toggle multi-sélection. */
export function toggleCrmAssignmentCommercial(
  filter: CrmAssignmentFilter,
  name: CrmCibleCommercial,
): CrmAssignmentFilter {
  const selected = filter.commercials.includes(name);
  if (isAllCrmAssignment(filter)) {
    return { unassigned: false, commercials: [name] };
  }
  if (selected) {
    return { ...filter, commercials: filter.commercials.filter((n) => n !== name) };
  }
  return { ...filter, commercials: [...filter.commercials, name] };
}

export function toggleCrmAssignmentUnassigned(filter: CrmAssignmentFilter): CrmAssignmentFilter {
  if (isAllCrmAssignment(filter)) {
    return { unassigned: true, commercials: [] };
  }
  if (filter.unassigned && filter.commercials.length === 0) {
    return emptyCrmAssignmentFilter();
  }
  return { ...filter, unassigned: !filter.unassigned };
}

export function crmCommercialTabBadgeClass(tab: CrmCommercialTab) {
  if (tab === "unassigned") return "bg-muted-foreground/20 text-muted-foreground";
  if (tab === "all") return "";
  return "bg-warning/20 text-warning";
}
