import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import { ProspectionCommuneRow } from "@/components/prospection/ProspectionCommuneRow";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROW_HEIGHT = 56;

type Props = {
  communes: ProspectionCommune[];
  state: Record<string, ProspectionCommuneState>;
  defaultRow: ProspectionCommuneState;
  dirtyKeys: Set<string>;
  onPatch: (communeKey: string, patch: Partial<ProspectionCommuneState>) => void;
  onOpenScript: (target: { ville: string; agglo: string; maire: string }) => void;
  onOpenDetail: (commune: ProspectionCommune) => void;
};

export function ProspectionVirtualTable({
  communes,
  state,
  defaultRow,
  dirtyKeys,
  onPatch,
  onOpenScript,
  onOpenDetail,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: communes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  if (communes.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
        Aucune commune trouvée.
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full min-h-0 overflow-auto overscroll-contain">
      <Table className="table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow>
            <TableHead className="w-9 px-2">#</TableHead>
            <TableHead className="w-[4%] px-2">Dép.</TableHead>
            <TableHead className="w-[11%] px-2">Commune</TableHead>
            <TableHead className="w-[13%] px-2">Agglomération</TableHead>
            <TableHead className="w-[10%] px-2">Maire</TableHead>
            <TableHead className="w-[8%] px-2">Qui gère EP ?</TableHead>
            <TableHead className="w-[8%] px-2">Statut</TableHead>
            <TableHead className="w-[10%] px-2">Prestataire</TableHead>
            <TableHead className="w-[10%] px-2">Contact</TableHead>
            <TableHead className="w-[11%] px-2">Notes</TableHead>
            <TableHead className="w-10 px-2">Script</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paddingTop > 0 ? (
            <TableRow aria-hidden className="border-0 hover:bg-transparent">
              <TableCell colSpan={11} className="p-0" style={{ height: paddingTop }} />
            </TableRow>
          ) : null}
          {virtualItems.map((virtualRow) => {
            const commune = communes[virtualRow.index];
            const row = state[commune.key] ?? defaultRow;
            return (
              <ProspectionCommuneRow
                key={commune.key}
                index={virtualRow.index + 1}
                commune={commune}
                row={row}
                isDirty={dirtyKeys.has(commune.key)}
                onPatch={onPatch}
                onOpenScript={onOpenScript}
                onOpenDetail={onOpenDetail}
              />
            );
          })}
          {paddingBottom > 0 ? (
            <TableRow aria-hidden className="border-0 hover:bg-transparent">
              <TableCell colSpan={11} className="p-0" style={{ height: paddingBottom }} />
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
