import { Badge } from "@/components/ui/badge";
import {
  CRM_CIBLE_COMMERCIAUX,
  crmCommercialTabBadgeClass,
  isCrmAssignmentTabSelected,
  type CrmAssignmentFilter,
  type CrmCommercialTab,
} from "@/lib/prospection/crmUi";
import { cn } from "@/lib/utils";

export type ProspectionCrmCommercialTabItem = {
  id: CrmCommercialTab;
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
};

export function buildProspectionCrmCommercialTabs({
  commercialCounts,
  assignmentFilter,
  onSelectTab,
}: {
  commercialCounts: Record<CrmCommercialTab, number>;
  assignmentFilter: CrmAssignmentFilter;
  onSelectTab: (tab: CrmCommercialTab) => void;
}): ProspectionCrmCommercialTabItem[] {
  return [
    {
      id: "all",
      label: "Tous",
      count: commercialCounts.all,
      selected: isCrmAssignmentTabSelected(assignmentFilter, "all"),
      onClick: () => onSelectTab("all"),
    },
    {
      id: "unassigned",
      label: "Non assignées",
      count: commercialCounts.unassigned,
      selected: isCrmAssignmentTabSelected(assignmentFilter, "unassigned"),
      onClick: () => onSelectTab("unassigned"),
    },
    ...CRM_CIBLE_COMMERCIAUX.map((name) => ({
      id: name as CrmCommercialTab,
      label: name,
      count: commercialCounts[name],
      selected: isCrmAssignmentTabSelected(assignmentFilter, name),
      onClick: () => onSelectTab(name),
    })),
  ];
}

export function ProspectionCrmCommercialTabsDesktop({ tabs }: { tabs: ProspectionCrmCommercialTabItem[] }) {
  return (
    <div className="flex flex-wrap gap-1 pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={tab.onClick}
          className={cn(
            "flex items-center gap-2 rounded-t-sm px-4 py-2 text-sm font-medium transition-colors",
            tab.selected
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {tab.label}
          <Badge
            variant={tab.selected ? "secondary" : "outline"}
            className={cn("text-xs tabular-nums", crmCommercialTabBadgeClass(tab.id))}
          >
            {tab.count}
          </Badge>
        </button>
      ))}
    </div>
  );
}

export function ProspectionCrmCommercialTabsMobileScroll({ tabs }: { tabs: ProspectionCrmCommercialTabItem[] }) {
  return (
    <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b px-1 pb-2 scrollbar-thin touch-pan-x snap-x snap-mandatory lg:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={tab.onClick}
          className={cn(
            "flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-t-sm px-3 py-2.5 text-xs font-medium transition-colors",
            tab.selected
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/60",
          )}
        >
          {tab.label}
          <Badge
            variant={tab.selected ? "secondary" : "outline"}
            className={cn("shrink-0 text-[10px] tabular-nums", crmCommercialTabBadgeClass(tab.id))}
          >
            {tab.count}
          </Badge>
        </button>
      ))}
    </div>
  );
}
