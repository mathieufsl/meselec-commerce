import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProspectionFiltersBar } from "@/components/prospection/ProspectionFiltersBar";
import {
  PROSPECTION_MAP_COLOR_MODES,
  type ProspectionMapColorMode,
} from "@/lib/prospection/mapTypes";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  filterDepartement: string;
  onFilterDepartementChange: (value: string) => void;
  filterAgglo: string;
  onFilterAggloChange: (value: string) => void;
  filterPop: string;
  onFilterPopChange: (value: string) => void;
  filterNuance: string;
  onFilterNuanceChange: (value: string) => void;
  nuances: string[];
  agglos: string[];
  colorMode: ProspectionMapColorMode;
  onColorModeChange: (value: ProspectionMapColorMode) => void;
  departements: string[];
};

export function ProspectionCartesControls({
  search,
  onSearchChange,
  filterDepartement,
  onFilterDepartementChange,
  filterAgglo,
  onFilterAggloChange,
  filterPop,
  onFilterPopChange,
  filterNuance,
  onFilterNuanceChange,
  nuances,
  agglos,
  colorMode,
  onColorModeChange,
  departements,
}: Props) {
  return (
    <div className="sticky top-0 z-30 shrink-0 border-b border-border/60 bg-background px-3 py-3 sm:px-6">
      <ProspectionFiltersBar
        variant="desktop"
        search={search}
        onSearchChange={onSearchChange}
        filterDepartement={filterDepartement}
        onFilterDepartementChange={onFilterDepartementChange}
        departements={departements}
        filterAgglo={filterAgglo}
        onFilterAggloChange={onFilterAggloChange}
        agglos={agglos}
        filterPop={filterPop}
        onFilterPopChange={onFilterPopChange}
        filterNuance={filterNuance}
        onFilterNuanceChange={onFilterNuanceChange}
        nuances={nuances}
      >
        <Select value={colorMode} onValueChange={(v) => onColorModeChange(v as ProspectionMapColorMode)}>
          <SelectTrigger
            id="prospection-map-color-mode"
            aria-label="Colorer par"
            className="ml-auto h-9 w-[190px] shrink-0"
          >
            <span className="mr-1 text-muted-foreground">Colorer :</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROSPECTION_MAP_COLOR_MODES.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ProspectionFiltersBar>
    </div>
  );
}
