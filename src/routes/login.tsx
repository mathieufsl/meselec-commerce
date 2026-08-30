import { useEffect, useState } from "react";
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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) {
      setRecoveryMode(true);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  async function onSetNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setMessage("Mot de passe mis à jour. Redirection…");
      window.history.replaceState(null, "", window.location.pathname);
      void navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible");
    } finally {
      setLoading(false);
    }
  }

  if (recoveryMode) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-center">
            <img src="/logo-rms.png" alt="" width={48} height={48} className="mx-auto h-12 w-12 object-contain" />
            <h1 className="mt-4 text-lg font-semibold">Nouveau mot de passe</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choisissez un mot de passe pour votre compte commerce.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSetNewPassword}>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-success">{message}</p> : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer le mot de passe
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="text-center">
          <img src="/logo-rms.png" alt="" width={48} height={48} className="mx-auto h-12 w-12 object-contain" />
          <h1 className="mt-4 text-lg font-semibold">RMSCom</h1>
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
          {message ? <p className="text-sm text-success">{message}</p> : null}

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
                    setMessage(
                      "Si l'email est configuré sur Supabase, vous recevrez un lien de réinitialisation.",
                    );
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
