import { memo, useEffect, useState, type MouseEvent } from "react";
import type { CrmCommune } from "@/data/crmCommunes";
import type { CrmCommuneState } from "@/lib/prospection/crmApi";
import { aggloBadgeClass } from "@/lib/prospection/ui";
import {
  CRM_CIBLE_COMMERCIAUX,
  departementShortLabel,
  normalizeQuiCible,
  nuanceBadgeClass,
  quiCibleSelectClass,
} from "@/lib/prospection/crmUi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Mail, Phone } from "lucide-react";

function stopRowClick(e: MouseEvent) {
  e.stopPropagation();
}

function CrmEmailLink({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="flex min-w-0 items-center gap-1 overflow-hidden text-primary hover:underline"
      title={email}
      onClick={stopRowClick}
    >
      <Mail className="h-3 w-3 shrink-0" />
      <span className="truncate text-[11px] leading-none">{email}</span>
    </a>
  );
}

const CrmTextInput = memo(function CrmTextInput({
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
  commune: CrmCommune;
  row: CrmCommuneState;
  isDirty: boolean;
  onPatch: (key: string, patch: Partial<CrmCommuneState>) => void;
  onOpenDetail: (commune: CrmCommune) => void;
};

export const ProspectionCrmCommuneRow = memo(
  function ProspectionCrmCommuneRow({
    index,
    commune,
    row,
    isDirty,
    onPatch,
    onOpenDetail,
  }: Props) {
    const { key } = commune;
    const quiCible = normalizeQuiCible(row.quiCible);

    return (
      <TableRow
        className={cn("cursor-pointer", isDirty && "ring-1 ring-inset ring-primary/30")}
        onClick={() => onOpenDetail(commune)}
        title="Cliquer pour ouvrir le détail"
      >
        <TableCell className="w-[2%] max-w-0 px-0.5 py-1 text-center text-[10px] text-muted-foreground">
          {index}
        </TableCell>
        <TableCell className="w-[3%] max-w-0 px-1 py-1 text-center text-[11px] font-medium text-muted-foreground">
          {departementShortLabel(commune.departement)}
        </TableCell>
        <TableCell className="w-[11%] max-w-0 px-1.5 py-1">
          <div className="truncate text-xs font-semibold leading-tight" title={commune.ville}>
            {commune.ville}
          </div>
          <div className="truncate text-[10px] leading-tight text-muted-foreground">
            {commune.habitants.toLocaleString("fr")} hab.
          </div>
        </TableCell>
        <TableCell className="w-[14%] max-w-0 px-1.5 py-1">
          <span
            className={cn(
              "block truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight",
              aggloBadgeClass(commune.agglo),
            )}
            title={commune.agglo || "N/A"}
          >
            {commune.agglo || "N/A"}
          </span>
        </TableCell>
        <TableCell className="w-[10%] max-w-0 truncate px-1.5 py-1 text-[11px] leading-tight" title={commune.maire}>
          {commune.maire}
        </TableCell>
        <TableCell className="w-[5%] max-w-0 px-1 py-1 text-center">
          {commune.nuance ? (
            <span
              className={cn(
                "inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                nuanceBadgeClass(commune.nuance),
              )}
            >
              {commune.nuance}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="w-[9%] max-w-0 px-1.5 py-1 text-[11px]" onClick={stopRowClick}>
          {commune.telephone ? (
            <a
              href={`tel:${commune.telephone.replace(/\s/g, "")}`}
              className="flex min-w-0 items-center gap-0.5 overflow-hidden text-primary hover:underline"
              title={commune.telephone}
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate leading-none">{commune.telephone}</span>
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="w-[15%] max-w-0 px-1.5 py-1" onClick={stopRowClick}>
          {commune.email ? <CrmEmailLink email={commune.email} /> : <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="w-[10%] max-w-0 px-1 py-1" onClick={stopRowClick}>
          <Select
            value={quiCible || "__none__"}
            onValueChange={(v) => onPatch(key, { quiCible: v === "__none__" ? "" : v })}
          >
            <SelectTrigger
              className={cn("h-7 w-full min-w-0 px-2 text-[10px]", quiCibleSelectClass(row.quiCible))}
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {CRM_CIBLE_COMMERCIAUX.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="w-[8%] max-w-0 px-1 py-1" onClick={stopRowClick}>
          <CrmTextInput
            value={row.prestataire}
            placeholder="Prestataire…"
            onCommit={(prestataire) => onPatch(key, { prestataire })}
            className="h-7 w-full min-w-0 text-[11px]"
          />
        </TableCell>
        <TableCell className="w-[10%] max-w-0 px-1 py-1" onClick={stopRowClick}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-full text-[11px]"
            onClick={() => onOpenDetail(commune)}
          >
            Voir plus
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
