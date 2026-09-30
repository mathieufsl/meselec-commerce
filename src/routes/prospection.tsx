import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/commerce/AppShell";
import { ProspectionSubNav } from "@/components/prospection/ProspectionSubNav";

export const Route = createFileRoute("/prospection")({
  component: ProspectionLayout,
});

function ProspectionLayout() {
  return (
    <AppShell
      title="Prospection"
      flush
      contentClassName="px-0 py-0"
      titleExtra={<ProspectionSubNav />}
      belowHeader={
        <div className="sm:hidden">
          <ProspectionSubNav />
        </div>
      }
    >
      <Outlet />
    </AppShell>
  );
}
