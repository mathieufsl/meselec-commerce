import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { AppShell } from "@/components/commerce/AppShell";

export const Route = createFileRoute("/fournisseurs")({
  component: FournisseursPage,
});

function FournisseursPage() {
  return (
    <AppShell title="Fournisseurs">
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center">
        <Construction className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">À venir</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Le répertoire fournisseurs (contacts, spécialités, retours chiffrage) sera disponible
          prochainement.
        </p>
      </div>
    </AppShell>
  );
}
