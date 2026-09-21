import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  PROSPECTION_MAP_SECTEURS,
  type ProspectionMapColorMode,
  type ProspectionMapSecteur,
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
  agglos: string[];
  secteur: ProspectionMapSecteur;
  onSecteurChange: (value: ProspectionMapSecteur) => void;
  colorMode: ProspectionMapColorMode;
  onColorModeChange: (value: ProspectionMapColorMode) => void;
  visibleCount: number;
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
  agglos,
  secteur,
  onSecteurChange,
  colorMode,
  onColorModeChange,
  visibleCount,
  departements,
}: Props) {
  return (
    <div className="space-y-3 border-b border-border/60 px-3 py-3 sm:px-6">
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
      >
        <div className="ml-auto text-xs text-muted-foreground">
          {visibleCount} commune{visibleCount > 1 ? "s" : ""} · coloration par contour communal
        </div>
      </ProspectionFiltersBar>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Secteur</Label>
          <div className="flex flex-wrap gap-1.5">
            {PROSPECTION_MAP_SECTEURS.map((item) => (
              <button
                key={item.secteur}
                type="button"
                disabled={!item.available}
                onClick={() => item.available && onSecteurChange(item.secteur)}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 data-[active=true]:border-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                data-active={secteur === item.secteur}
              >
                {item.label}
                {!item.available ? (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    Bientôt
                  </Badge>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-[180px] space-y-1">
          <Label htmlFor="prospection-map-color-mode" className="text-xs text-muted-foreground">
            Colorer par
          </Label>
          <Select value={colorMode} onValueChange={(v) => onColorModeChange(v as ProspectionMapColorMode)}>
            <SelectTrigger id="prospection-map-color-mode" className="h-9">
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
        </div>
      </div>
    </div>
  );
}
