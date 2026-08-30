import { Badge } from "@/components/ui/badge";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import { STATUS_OPTIONS, prospectionStatusBadgeClass } from "@/lib/prospection/ui";
import { cn } from "@/lib/utils";

export type ProspectionStatusTab = "all" | ProspectionCommuneState["status"];

export type ProspectionStatusTabItem = {
  id: ProspectionStatusTab;
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
};

export function buildProspectionStatusTabs({
  statusCounts,
  statusTab,
  onSelectTab,
}: {
  statusCounts: Record<ProspectionStatusTab, number>;
  statusTab: ProspectionStatusTab;
  onSelectTab: (tab: ProspectionStatusTab) => void;
}): ProspectionStatusTabItem[] {
  return [
    {
      id: "all",
      label: "Tous",
      count: statusCounts.all,
      selected: statusTab === "all",
      onClick: () => onSelectTab("all"),
    },
    ...STATUS_OPTIONS.map((opt) => ({
      id: opt.value,
      label: opt.label,
      count: statusCounts[opt.value],
      selected: statusTab === opt.value,
      onClick: () => onSelectTab(opt.value),
    })),
  ];
}

export function ProspectionStatusTabsDesktop({ tabs }: { tabs: ProspectionStatusTabItem[] }) {
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
            className={cn("text-xs tabular-nums", prospectionStatusBadgeClass(tab.id))}
          >
            {tab.count}
          </Badge>
        </button>
      ))}
    </div>
  );
}

export function ProspectionStatusTabsMobileScroll({ tabs }: { tabs: ProspectionStatusTabItem[] }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 scrollbar-thin touch-pan-x snap-x snap-mandatory">
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
            className={cn("shrink-0 text-[10px] tabular-nums", prospectionStatusBadgeClass(tab.id))}
          >
            {tab.count}
          </Badge>
        </button>
      ))}
    </div>
  );
}
