import { Button } from "@/components/ui/button";
import {
  AO_SECTEUR_LABELS,
  AO_SECTEURS,
  type AoSecteurCode,
} from "@/lib/commerceTypes";
import { cn } from "@/lib/utils";

export const AO_SECTEUR_BADGE_CLASS: Record<AoSecteurCode, string> = {
  EP: "bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-400",
  CFO_CFA: "bg-violet-500/15 text-violet-800 border-violet-500/25 dark:text-violet-400",
  Illumination: "bg-amber-500/15 text-amber-800 border-amber-500/25 dark:text-amber-400",
  VRD: "bg-emerald-500/15 text-emerald-800 border-emerald-500/25 dark:text-emerald-400",
  Enedis: "bg-orange-500/15 text-orange-800 border-orange-500/25 dark:text-orange-400",
};

export function CommerceAoSecteurFilter({
  selected,
  onChange,
  compact = false,
}: {
  selected: AoSecteurCode[];
  onChange: (value: AoSecteurCode[]) => void;
  compact?: boolean;
}) {
  function toggle(code: AoSecteurCode) {
    onChange(
      selected.includes(code) ? selected.filter((s) => s !== code) : [...selected, code],
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {!compact ? (
        <span className="text-xs font-medium text-muted-foreground">Secteur</span>
      ) : null}
      {AO_SECTEURS.map((code) => {
        const on = selected.includes(code);
        return (
          <Button
            key={code}
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "h-9 shrink-0 gap-1 px-2.5 text-xs font-normal",
              on && cn("border", AO_SECTEUR_BADGE_CLASS[code]),
            )}
            onClick={() => toggle(code)}
          >
            {on ? "✓ " : null}
            {AO_SECTEUR_LABELS[code]}
          </Button>
        );
      })}
    </div>
  );
}
