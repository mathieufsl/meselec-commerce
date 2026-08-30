import { memo, useEffect, useState, type MouseEvent } from "react";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import { departementShortLabel } from "@/lib/prospection/crmUi";
import {
  GESTION_OPTIONS,
  STATUS_OPTIONS,
  aggloBadgeClass,
  statusRowClass,
  statusSelectClass,
} from "@/lib/prospection/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

function stopRowClick(e: MouseEvent) {
  e.stopPropagation();
}

/** Champ texte local : pas de re-render du tableau à chaque frappe. */
const ProspectionTextInput = memo(function ProspectionTextInput({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <Input
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== value) onCommit(local);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      onClick={stopRowClick}
      className={className}
    />
  );
});

type Props = {
  index: number;
  commune: ProspectionCommune;
  row: ProspectionCommuneState;
  isDirty: boolean;
  onPatch: (communeKey: string, patch: Partial<ProspectionCommuneState>) => void;
  onOpenScript: (target: { ville: string; agglo: string; maire: string }) => void;
  onOpenDetail: (commune: ProspectionCommune) => void;
};

export const ProspectionCommuneRow = memo(
  function ProspectionCommuneRow({
    index,
    commune,
    row,
    isDirty,
    onPatch,
    onOpenScript,
    onOpenDetail,
  }: Props) {
    const ville = commune.ville;
    const communeKey = commune.key;

    return (
      <TableRow
        className={cn(
          "cursor-pointer",
          statusRowClass(row.status),
          isDirty && "ring-1 ring-inset ring-primary/30",
        )}
        onClick={() => onOpenDetail(commune)}
        title="Cliquer pour ouvrir le détail"
      >
        <TableCell className="px-2 py-1.5 text-[11px] text-muted-foreground">{index}</TableCell>
        <TableCell className="px-2 py-1.5 text-center text-[11px] font-semibold text-muted-foreground">
          {departementShortLabel(commune.departement)}
        </TableCell>
        <TableCell className="px-2 py-1.5">
          <div className="truncate font-semibold" title={ville}>
            {ville}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {commune.habitants.toLocaleString("fr")} hab.
          </div>
        </TableCell>
        <TableCell className="max-w-0 px-2 py-1.5">
          <span
            className={cn(
              "block truncate rounded-md px-2 py-0.5 text-[10px] font-semibold",
              aggloBadgeClass(commune.agglo),
            )}
            title={commune.agglo || "N/A"}
          >
            {commune.agglo || "N/A"}
          </span>
        </TableCell>
        <TableCell className="max-w-0 truncate px-2 py-1.5 text-xs" title={commune.maire}>
          {commune.maire}
        </TableCell>
        <TableCell className="px-2 py-1.5" onClick={stopRowClick}>
          <Select
            value={row.gestion || "__none__"}
            onValueChange={(v) =>
              onPatch(communeKey, {
                gestion: (v === "__none__" ? "" : v) as ProspectionCommuneState["gestion"],
              })
            }
          >
            <SelectTrigger className="h-8 w-full min-w-0 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GESTION_OPTIONS.map((o) => (
                <SelectItem key={o.value || "__none__"} value={o.value || "__none__"}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="px-2 py-1.5" onClick={stopRowClick}>
          <Select
            value={row.status}
            onValueChange={(v) => onPatch(communeKey, { status: v as ProspectionCommuneState["status"] })}
          >
            <SelectTrigger
              className={cn("h-8 w-full min-w-0 text-[10px]", statusSelectClass(row.status))}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="max-w-0 px-2 py-1.5" onClick={stopRowClick}>
          <ProspectionTextInput
            value={row.prestataire}
            placeholder="ex: Spie Citéos"
            onCommit={(prestataire) => onPatch(communeKey, { prestataire })}
            className={cn(
              "h-8 w-full min-w-0 text-xs",
              row.prestataire && "border-success/30 bg-success-subtle font-semibold text-success",
            )}
          />
        </TableCell>
        <TableCell className="max-w-0 px-2 py-1.5" onClick={stopRowClick}>
          <ProspectionTextInput
            value={row.contact}
            placeholder="Nom + tél"
            onCommit={(contact) => onPatch(communeKey, { contact })}
            className="h-8 w-full min-w-0 text-xs"
          />
        </TableCell>
        <TableCell className="max-w-0 px-2 py-1.5" onClick={stopRowClick}>
          <ProspectionTextInput
            value={row.notes}
            placeholder="Notes…"
            onCommit={(notes) => onPatch(communeKey, { notes })}
            className="h-8 w-full min-w-0 text-xs"
          />
        </TableCell>
        <TableCell className="px-2 py-1.5" onClick={stopRowClick}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="Script d'appel"
            onClick={() =>
              onOpenScript({ ville, agglo: commune.agglo, maire: commune.maire })
            }
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>
    );
  },
  (prev, next) =>
    prev.index === next.index &&
    prev.isDirty === next.isDirty &&
    prev.row === next.row &&
    prev.commune === next.commune,
);
