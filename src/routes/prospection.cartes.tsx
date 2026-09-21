import { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

const ProspectionCartesWorkspace = lazy(() =>
  import("@/components/prospection/ProspectionCartesWorkspace").then((m) => ({
    default: m.ProspectionCartesWorkspace,
  })),
);

export const Route = createFileRoute("/prospection/cartes")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search["q"] as string) || undefined,
    dep: (search["dep"] as string) || undefined,
    agglo: (search["agglo"] as string) || undefined,
    pop: (search["pop"] as string) || undefined,
    status: (search["status"] as string) || undefined,
    mode: (search["mode"] as string) || undefined,
    highlight: (search["highlight"] as string) || undefined,
  }),
  component: ProspectionCartesPage,
});

function ProspectionCartesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ouverture de la carte…
        </div>
      }
    >
      <ProspectionCartesWorkspace />
    </Suspense>
  );
}
