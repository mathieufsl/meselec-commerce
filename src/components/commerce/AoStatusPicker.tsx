import { Check, ChevronDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AO_STATUT_LABELS, AO_STATUTS, type AoStatut } from "@/lib/commerceTypes";
import { AO_STATUT_STYLES } from "@/lib/aoStatusStyles";
import { cn } from "@/lib/utils";

/** Pastille de statut colorée ; menu déroulant pour le changer si `onChange` est fourni. */
export function AoStatusPicker({
  statut,
  onChange,
  pending = false,
  className,
}: {
  statut: AoStatut;
  onChange?: (statut: AoStatut) => void;
  pending?: boolean;
  className?: string;
}) {
  const style = AO_STATUT_STYLES[statut];
  const pill = (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold",
        style.badge,
        onChange && "cursor-pointer transition-opacity hover:opacity-80",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span className={cn("h-2 w-2 rounded-full", style.dot)} />
      )}
      {AO_STATUT_LABELS[statut]}
      {onChange ? <ChevronDown className="h-3.5 w-3.5 opacity-70" /> : null}
    </span>
  );

  if (!onChange) return pill;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={pending}>
        <button type="button" aria-label={`Statut : ${AO_STATUT_LABELS[statut]}. Changer`}>
          {pill}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {AO_STATUTS.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => s !== statut && onChange(s)} className="gap-2">
            <span className={cn("h-2 w-2 rounded-full", AO_STATUT_STYLES[s].dot)} />
            <span className="flex-1">{AO_STATUT_LABELS[s]}</span>
            {s === statut ? <Check className="h-3.5 w-3.5 text-muted-foreground" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
