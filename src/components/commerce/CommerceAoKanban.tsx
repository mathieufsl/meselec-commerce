import { useMemo, useState } from "react";
import {
  AO_PIPELINE_COLUMNS,
  AO_STATUT_LABELS,
  type AppelOffre,
  type AoStatut,
} from "@/lib/commerceTypes";
import { AO_STATUT_STYLES } from "@/lib/aoStatusStyles";
import { formatEuro } from "@/lib/bpuEngine";
import { cn } from "@/lib/utils";
import { CommerceAoCard } from "@/components/commerce/CommerceAoCard";

const ARCHIVE_STATUTS: AoStatut[] = ["abandonne"];

export function CommerceAoKanban({
  items,
  docCounts,
  onMoveStatut,
  isMoving,
  onCardSelect,
}: {
  items: AppelOffre[];
  docCounts: Record<string, number>;
  onMoveStatut: (aoId: string, statut: AoStatut) => void;
  isMoving?: boolean;
  onCardSelect?: (ao: AppelOffre) => void;
}) {
  const [dragOverColumn, setDragOverColumn] = useState<AoStatut | null>(null);

  const visibleStatuts = useMemo(() => {
    const hasArchive = ARCHIVE_STATUTS.some((s) => items.some((ao) => ao.statut === s));
    return [
      ...AO_PIPELINE_COLUMNS,
      ...(hasArchive ? ARCHIVE_STATUTS : []),
    ] as AoStatut[];
  }, [items]);

  const columns = visibleStatuts.map((statut) => ({
    statut,
    items: items.filter((ao) => ao.statut === statut),
  }));

  function handleDragOver(e: React.DragEvent, statut: AoStatut) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(statut);
  }

  function handleDrop(e: React.DragEvent, statut: AoStatut) {
    e.preventDefault();
    setDragOverColumn(null);
    const aoId = e.dataTransfer.getData("text/ao-id");
    if (!aoId) return;
    const ao = items.find((a) => a.id === aoId);
    if (!ao || ao.statut === statut) return;
    onMoveStatut(aoId, statut);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-x-auto px-4 pb-3 pt-2 sm:px-6">
        <div className="flex h-full items-start gap-2.5 pb-1">
          {columns.map(({ statut, items: columnItems }) => {
            const total = columnItems.reduce((s, a) => s + (a.montant_estime ?? 0), 0);
            const isOver = dragOverColumn === statut;
            const isArchive = ARCHIVE_STATUTS.includes(statut);

            return (
              <section
                key={statut}
                className={cn(
                  "flex w-[248px] shrink-0 flex-col overflow-hidden rounded-lg border bg-muted/10",
                  isArchive && "w-[220px] opacity-95",
                  isOver && "border-primary/40 bg-primary/[0.03] ring-1 ring-primary/25",
                )}
                onDragOver={(e) => handleDragOver(e, statut)}
                onDragLeave={() => setDragOverColumn((prev) => (prev === statut ? null : prev))}
                onDrop={(e) => handleDrop(e, statut)}
              >
                <header
                  className={cn(
                    "shrink-0 border-b px-2.5 py-2",
                    AO_STATUT_STYLES[statut].badge,
                    "rounded-t-lg border-border/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", AO_STATUT_STYLES[statut].dot)} />
                      <h3 className="truncate text-xs font-semibold">
                        {AO_STATUT_LABELS[statut]}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-md bg-background/60 px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                      {columnItems.length}
                    </span>
                  </div>
                  {total > 0 ? (
                    <p className="mt-0.5 truncate text-xs font-medium tabular-nums opacity-80">
                      {formatEuro(total)}
                    </p>
                  ) : null}
                </header>

                <div className="flex max-h-[calc(100dvh-22rem)] flex-col gap-1.5 overflow-y-auto p-1.5">
                  {columnItems.length === 0 ? (
                    <div
                      className={cn(
                        "rounded-md border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground/70",
                        isOver && "border-primary/40 bg-primary/5 text-primary",
                      )}
                    >
                      {isOver ? "Déposer ici" : ""}
                    </div>
                  ) : (
                    columnItems.map((ao) => (
                      <CommerceAoCard
                        key={ao.id}
                        ao={ao}
                        statut={statut}
                        {...(docCounts[ao.id] !== undefined ? { docCount: docCounts[ao.id] } : {})}
                        {...(onCardSelect ? { onSelect: onCardSelect } : {})}
                        variant="kanban"
                        draggable={!isMoving}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/ao-id", ao.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
