import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { nuanceColor, nuanceLabel, parseNuanceFilter, serializeNuanceFilter } from "@/lib/prospection/nuances";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";

const POP_OPTIONS = [
  { id: "", label: "Toutes tailles" },
  { id: "big", label: "+ 5 000 hab." },
  { id: "med", label: "1 000 – 5 000" },
  { id: "small", label: "- 1 000 hab." },
] as const;

export type ProspectionFiltersBarProps = {
  variant: "mobile-sticky" | "desktop";
  search: string;
  onSearchChange: (value: string) => void;
  filterDepartement: string;
  onFilterDepartementChange: (value: string) => void;
  departements: string[];
  filterAgglo: string;
  onFilterAggloChange: (value: string) => void;
  agglos: string[];
  filterPop: string;
  onFilterPopChange: (value: string) => void;
  filterNuance?: string;
  onFilterNuanceChange?: (value: string) => void;
  nuances?: string[];
  mobileFiltersOpen?: boolean;
  onMobileFiltersOpenChange?: (open: boolean) => void;
  className?: string;
  children?: ReactNode;
};

export function ProspectionFiltersBar({
  variant,
  search,
  onSearchChange,
  filterDepartement,
  onFilterDepartementChange,
  departements,
  filterAgglo,
  onFilterAggloChange,
  agglos,
  filterPop,
  onFilterPopChange,
  filterNuance = "",
  onFilterNuanceChange,
  nuances = [],
  mobileFiltersOpen,
  onMobileFiltersOpenChange,
  className,
  children,
}: ProspectionFiltersBarProps) {
  const popLabel = POP_OPTIONS.find((o) => o.id === filterPop)?.label ?? "Taille";

  if (variant === "mobile-sticky") {
    return (
      <div className={cn("lg:hidden", className)}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher une commune, maire…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-11 rounded-md border-border/70 bg-background pl-9 pr-3"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn("h-11 w-11 rounded-md", mobileFiltersOpen && "border-primary/40 bg-primary/10")}
            onClick={() => onMobileFiltersOpenChange?.(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2", className)}>
      <div className="relative w-full sm:w-[280px] lg:w-[320px] xl:w-[360px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher une commune, maire, agglomération…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 bg-background pl-9"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal">
            Département
            {filterDepartement ? (
              <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-xs">
                1
              </Badge>
            ) : null}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[min(60vh,360px)] w-64 overflow-y-auto">
          <DropdownMenuItem onClick={() => onFilterDepartementChange("")}>
            {!filterDepartement && "✓ "}Tous départements
          </DropdownMenuItem>
          {departements.map((dep) => (
            <DropdownMenuItem key={dep} onClick={() => onFilterDepartementChange(dep)}>
              {filterDepartement === dep && "✓ "}
              <span className="truncate">{dep}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal">
            Agglomération
            {filterAgglo ? (
              <Badge variant="secondary" className="ml-0.5 h-5 max-w-[120px] truncate px-1.5 text-xs">
                1
              </Badge>
            ) : null}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[min(60vh,360px)] w-72 overflow-y-auto">
          <DropdownMenuItem onClick={() => onFilterAggloChange("")}>
            {!filterAgglo && "✓ "}Toutes les agglomérations
          </DropdownMenuItem>
          {agglos.map((agglo) => (
            <DropdownMenuItem key={agglo} onClick={() => onFilterAggloChange(agglo)}>
              {filterAgglo === agglo && "✓ "}
              <span className="truncate">{agglo}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal">
            {filterPop ? popLabel : "Taille"}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {POP_OPTIONS.map((opt) => (
            <DropdownMenuItem key={opt.id || "all"} onClick={() => onFilterPopChange(opt.id)}>
              {filterPop === opt.id && "✓ "}
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {onFilterNuanceChange && nuances.length > 0 ? (
        <NuanceFilterMenu value={filterNuance} onChange={onFilterNuanceChange} nuances={nuances} />
      ) : null}

      {children}
    </div>
  );
}

export function NuanceFilterMenu({
  value,
  onChange,
  nuances,
}: {
  value: string;
  onChange: (value: string) => void;
  nuances: string[];
  }) {
  const selected = parseNuanceFilter(value);
  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(serializeNuanceFilter(next));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal">
          Nuance politique
          {selected.size > 0 ? (
            <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-xs">
              {selected.size}
            </Badge>
          ) : null}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(60vh,420px)] w-72 overflow-y-auto">
        <DropdownMenuItem disabled={selected.size === 0} onClick={() => onChange("")}>
          Toutes les nuances
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {nuances.map((code) => (
          <DropdownMenuCheckboxItem
            key={code}
            checked={selected.has(code)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle(code)}
          >
            <span
              className="mr-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: nuanceColor(code) }}
            />
            <span className="truncate">
              {code === "__none__" ? "Non renseigné" : `${code} · ${nuanceLabel(code)}`}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
