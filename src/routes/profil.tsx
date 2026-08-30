import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, User } from "lucide-react";
import { AppShell } from "@/components/commerce/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCommerceAuth } from "@/hooks/useCommerceAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profil")({
  component: ProfilPage,
});

function ProfilPage() {
  const { user } = useCommerceAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [form, setForm] = useState({ prenom: "", nom: "", telephone: "" });
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirm: "",
  });

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data, error } = await supabase
        .from("commerce_profiles")
        .select("prenom, nom, telephone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error && data) {
        setForm({
          prenom: data.prenom ?? "",
          nom: data.nom ?? "",
          telephone: data.telephone ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user?.id]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("commerce_profiles").upsert(
        {
          user_id: user.id,
          prenom: form.prenom.trim() || null,
          nom: form.nom.trim() || null,
          telephone: form.telephone.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      await supabase.auth.updateUser({
        data: {
          first_name: form.prenom.trim() || null,
          full_name: [form.prenom, form.nom].filter(Boolean).join(" ") || null,
        },
      });
      toast.success("Profil enregistré");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
      if (error) throw error;
      setPasswordForm({ password: "", confirm: "" });
      toast.success("Mot de passe mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <AppShell title="Mon profil">
      <div className="mx-auto max-w-xl space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5" />
                  Identité
                </CardTitle>
                <CardDescription>
                  Utilisé dans l&apos;en-tête et le suivi des dépôts de documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      value={form.prenom}
                      onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      value={form.nom}
                      onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel">Téléphone</Label>
                  <Input
                    id="tel"
                    value={form.telephone}
                    onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                  />
                </div>
                <Button className="w-full sm:w-auto" onClick={() => void saveProfile()} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Enregistrer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mot de passe</CardTitle>
                <CardDescription>Modifier votre mot de passe de connexion commerce.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={changePassword}>
                  <div className="space-y-2">
                    <Label htmlFor="password">Nouveau mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.password}
                      onChange={(e) =>
                        setPasswordForm((f) => ({ ...f, password: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirmer</Label>
                    <Input
                      id="confirm"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirm}
                      onChange={(e) =>
                        setPasswordForm((f) => ({ ...f, confirm: e.target.value }))
                      }
                    />
                  </div>
                  <Button type="submit" variant="outline" className="w-full sm:w-auto" disabled={passwordSaving}>
                    {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Mettre à jour le mot de passe
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
