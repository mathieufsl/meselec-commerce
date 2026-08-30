import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/commerce/AppShell";
import { ProspectionWorkspace } from "@/components/prospection/ProspectionWorkspace";

export const Route = createFileRoute("/prospection")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search["q"] as string) || undefined,
    dep: (search["dep"] as string) || undefined,
    agglo: (search["agglo"] as string) || undefined,
    pop: (search["pop"] as string) || undefined,
    status: (search["status"] as string) || undefined,
  }),
  component: ProspectionPage,
});

function ProspectionPage() {
  return (
    <AppShell
      title="Prospection EP"
      flush
      contentClassName="px-0 py-0"
    >
      <ProspectionWorkspace />
    </AppShell>
  );
}
