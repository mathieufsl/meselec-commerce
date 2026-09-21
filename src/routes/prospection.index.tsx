import { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

const ProspectionWorkspace = lazy(() =>
  import("@/components/prospection/ProspectionWorkspace").then((m) => ({
    default: m.ProspectionWorkspace,
  })),
);

export const Route = createFileRoute("/prospection/")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search["q"] as string) || undefined,
    dep: (search["dep"] as string) || undefined,
    agglo: (search["agglo"] as string) || undefined,
    pop: (search["pop"] as string) || undefined,
    status: (search["status"] as string) || undefined,
  }),
  component: ProspectionListePage,
});

function ProspectionListePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ouverture de la prospection…
        </div>
      }
    >
      <ProspectionWorkspace />
    </Suspense>
  );
}
