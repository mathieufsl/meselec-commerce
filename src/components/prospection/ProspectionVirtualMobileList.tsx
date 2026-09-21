import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import { ProspectionCommuneMobileCard } from "@/components/prospection/ProspectionCommuneMobileCard";

const CARD_HEIGHT = 132;

type Props = {
  communes: ProspectionCommune[];
  state: Record<string, ProspectionCommuneState>;
  defaultRow: ProspectionCommuneState;
  dirtyKeys: Set<string>;
  onOpenDetail: (commune: ProspectionCommune) => void;
};

export function ProspectionVirtualMobileList({
  communes,
  state,
  defaultRow,
  dirtyKeys,
  onOpenDetail,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: communes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT,
    overscan: 6,
  });

  if (communes.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">Aucune commune trouvée.</p>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-auto overscroll-contain p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
        {virtualItems.map((virtualRow) => {
          const commune = communes[virtualRow.index];
          return (
            <div
              key={commune.key}
              className="absolute left-3 right-3"
              style={{
                top: virtualRow.start,
                height: virtualRow.size,
              }}
            >
              <ProspectionCommuneMobileCard
                commune={commune}
                row={state[commune.key] ?? defaultRow}
                isDirty={dirtyKeys.has(commune.key)}
                onOpenDetail={onOpenDetail}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
