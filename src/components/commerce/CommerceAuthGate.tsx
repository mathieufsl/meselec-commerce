import { Link, useRouterState } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { useCommerceAuth } from "@/hooks/useCommerceAuth";
import { Button } from "@/components/ui/button";

export function CommerceAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { booting, session, hasAccess, checkingAccess, signOut } = useCommerceAuth();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (booting || checkingAccess) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connexion…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Connexion requise</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Les catalogues et appels d&apos;offres sont protégés. Connectez-vous avec un compte
              autorisé (allowlist commerce).
            </p>
          </div>
          <Button asChild>
            <Link to="/login">Se connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-4 rounded-xl border border-amber-500/30 bg-card p-6 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
          <div>
            <h1 className="text-lg font-semibold">Accès non autorisé</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Le compte <strong>{session.user.email}</strong> n&apos;est pas dans la liste commerce.
              Contactez un administrateur pour être ajouté à{" "}
              <code className="text-xs">commerce_allowed_emails</code>.
            </p>
          </div>
          <Button variant="outline" onClick={() => void signOut()}>
            Changer de compte
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
