import { useEffect, useState } from "react";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import { ProspectionCartesCommuneEditor } from "@/components/prospection/ProspectionCartesCommuneEditor";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/** Même breakpoint que le panneau latéral desktop (`lg:`). */
const DESKTOP_PANEL_MIN_WIDTH = 1024;

function useCompactCartesLayout() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${DESKTOP_PANEL_MIN_WIDTH - 1}px)`);
    const update = () => setCompact(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return compact;
}

type Props = {
  commune: ProspectionCommune | null;
  state: ProspectionCommuneState | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: Partial<ProspectionCommuneState>) => Promise<void>;
};

export function ProspectionCartesCommuneSheet({
  commune,
  state,
  open,
  onOpenChange,
  onSave,
}: Props) {
  const compact = useCompactCartesLayout();

  if (!commune || !state || !compact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[85vh] flex-col p-0">
        <ProspectionCartesCommuneEditor
          commune={commune}
          state={state}
          onSave={onSave}
          onClose={() => onOpenChange(false)}
          className="flex min-h-0 flex-1 flex-col"
        />
      </SheetContent>
    </Sheet>
  );
}
