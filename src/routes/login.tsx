import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "magic") {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (otpError) throw otpError;
        setMessage("Un lien de connexion a été envoyé à votre adresse email.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        void navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="text-center">
          <img src="/logo-meselec.svg" alt="Meselec" className="mx-auto h-8" />
          <h1 className="mt-4 text-lg font-semibold">Meselec Commerce</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez-vous avec un compte autorisé
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@meselec.fr"
            />
          </div>

          {mode === "password" ? (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "password" ? "Se connecter" : "Recevoir un lien"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {mode === "password" ? (
            <>
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={() => setMode("magic")}
              >
                Connexion par lien magique
              </button>
              {" · "}
              <button
                type="button"
                className="underline hover:text-foreground"
                disabled={!email.trim() || loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  setMessage(null);
                  try {
                    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                      email.trim(),
                      { redirectTo: `${window.location.origin}/login` },
                    );
                    if (resetError) throw resetError;
                    setMessage("Email de réinitialisation envoyé.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Envoi impossible");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Mot de passe oublié
              </button>
            </>
          ) : (
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={() => setMode("password")}
            >
              Connexion par mot de passe
            </button>
          )}
        </p>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="underline hover:text-foreground">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
