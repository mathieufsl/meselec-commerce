import { memo, useEffect, useState, type MouseEvent } from "react";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import { departementShortLabel } from "@/lib/prospection/crmUi";
import {
  GESTION_OPTIONS,
  PORTE_ENTREE_OPTIONS,
  STATUS_OPTIONS,
  aggloBadgeClass,
  gestionPillClass,
  porteEntreePillClass,
  statusRowClass,
  statusSelectClass,
} from "@/lib/prospection/ui";
import { nuanceColor, nuanceLabel } from "@/lib/prospection/nuances";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { ProspectionResponsablesSelect } from "@/components/prospection/ProspectionResponsablesPicker";
import { PillSelect } from "@/components/prospection/ProspectionPillSelect";
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
      className={cn(
        "border-transparent bg-transparent shadow-none placeholder:text-muted-foreground/40 hover:bg-muted/70 focus-visible:bg-background",
        className,
      )}
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
        <TableCell className="max-w-0 px-2 py-1.5">
          {commune.nuance ? (
            <span
              className="inline-flex max-w-full items-center gap-1.5 truncate text-[10px] font-semibold"
              title={nuanceLabel(commune.nuance)}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: nuanceColor(commune.nuance) }}
              />
              {commune.nuance}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="max-w-0 px-1 py-1.5" onClick={stopRowClick}>
          <PillSelect
            value={row.gestion}
            options={GESTION_OPTIONS}
            pillClass={gestionPillClass}
            onChange={(v) => onPatch(communeKey, { gestion: v as ProspectionCommuneState["gestion"] })}
          />
        </TableCell>
        <TableCell className="max-w-0 px-1 py-1.5" onClick={stopRowClick}>
          <PillSelect
            value={row.gestionVoirie}
            options={GESTION_OPTIONS}
            pillClass={gestionPillClass}
            onChange={(v) => onPatch(communeKey, { gestionVoirie: v as ProspectionCommuneState["gestionVoirie"] })}
          />
        </TableCell>
        <TableCell className="max-w-0 px-1 py-1.5" onClick={stopRowClick}>
          <PillSelect
            value={row.porteEntree}
            options={PORTE_ENTREE_OPTIONS}
            pillClass={porteEntreePillClass}
            onChange={(v) => onPatch(communeKey, { porteEntree: v as ProspectionCommuneState["porteEntree"] })}
          />
        </TableCell>
        <TableCell className="max-w-0 px-1 py-1.5" onClick={stopRowClick}>
          <PillSelect
            value={row.status}
            options={STATUS_OPTIONS}
            pillClass={statusSelectClass}
            onChange={(v) => onPatch(communeKey, { status: v as ProspectionCommuneState["status"] })}
          />
        </TableCell>
        <TableCell className="max-w-0 px-2 py-1.5" onClick={stopRowClick}>
          <ProspectionResponsablesSelect
            value={row.responsables}
            onChange={(responsables) => onPatch(communeKey, { responsables })}
          />
        </TableCell>
        <TableCell className="max-w-0 px-2 py-1.5" onClick={stopRowClick}>
          <ProspectionTextInput
            value={row.prestataire}
            placeholder="—"
            onCommit={(prestataire) => onPatch(communeKey, { prestataire })}
            className={cn(
              "h-8 w-full min-w-0 text-xs",
              row.prestataire && "font-semibold text-success",
            )}
          />
        </TableCell>
        <TableCell className="max-w-0 px-2 py-1.5" onClick={stopRowClick}>
          <ProspectionTextInput
            value={row.prestataireVoirie}
            placeholder="—"
            onCommit={(prestataireVoirie) => onPatch(communeKey, { prestataireVoirie })}
            className={cn(
              "h-8 w-full min-w-0 text-xs",
              row.prestataireVoirie && "font-semibold text-success",
            )}
          />
        </TableCell>
        <TableCell
          className="max-w-0 truncate px-2 py-1.5 text-xs text-muted-foreground"
          title={row.contact || "Ouvrir le détail pour gérer les contacts"}
        >
          {row.contact || "—"}
        </TableCell>
        <TableCell className="max-w-0 px-2 py-1.5" onClick={stopRowClick}>
          <ProspectionTextInput
            value={row.notes}
            placeholder="—"
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
