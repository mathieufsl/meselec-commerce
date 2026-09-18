import { useMemo, useState } from "react";
import {
  KeyRound,
  Loader2,
  Mail,
  MoreVertical,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/commerce/AppShell";
import { CommerceModuleRolePicker } from "@/components/commerce/CommerceModuleRolePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommerceAuth } from "@/hooks/useCommerceAuth";
import {
  useAllowCommerceEmail,
  useCommerceAccounts,
  useCreateCommerceAccount,
  useDeleteCommerceAccount,
  useSendCommercePasswordReset,
  useSetCommerceModuleRoles,
  useUpdateCommerceAccountPassword,
  type CommerceAccount,
} from "@/hooks/useCommerceAccounts";
import { useCommerceSettings, useSocietes } from "@/hooks/useCommerceData";
import {
  commerceAccountDisplayName,
  validateCommercePassword,
} from "@/lib/commerceAccounts";
import {
  COMMERCE_ALL_MODULES,
  countActiveCommerceModules,
  defaultFullCommerceModuleRoles,
  moduleRolesFromAccountRpc,
  summarizeCommerceModules,
  type CommerceModule,
  type CommerceModuleRole,
} from "@/lib/commerceModuleRoles";
import { syncErpCache } from "@/lib/syncErpCache";
import { useQueryClient } from "@tanstack/react-query";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR");
}

export function AdminPage() {
  const { user, canManageAccounts, hasModule, hasEditorAccess } = useCommerceAuth();
  const { data: settings } = useCommerceSettings();
  const { data: societes = [] } = useSocietes();
  const { data: accounts = [], isLoading: loadingAccounts, refetch } = useCommerceAccounts(
    canManageAccounts,
  );
  const createAccount = useCreateCommerceAccount();
  const allowEmail = useAllowCommerceEmail();
  const updatePassword = useUpdateCommerceAccountPassword();
  const sendReset = useSendCommercePasswordReset();
  const deleteAccount = useDeleteCommerceAccount();
  const setModuleRoles = useSetCommerceModuleRoles();
  const qc = useQueryClient();

  const canEditAdmin = hasEditorAccess("admin");
  const showComptes = canManageAccounts;
  const showParametres = hasModule("admin");

  const [busySync, setBusySync] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"full" | "allow">("full");
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    confirm: "",
    prenom: "",
    nom: "",
  });
  const [createRoles, setCreateRoles] = useState(defaultFullCommerceModuleRoles);

  const [modulesTarget, setModulesTarget] = useState<CommerceAccount | null>(null);
  const [editRoles, setEditRoles] = useState(defaultFullCommerceModuleRoles);

  const [passwordTarget, setPasswordTarget] = useState<CommerceAccount | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<CommerceAccount | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => {
      const name = commerceAccountDisplayName(a).toLowerCase();
      return a.email.toLowerCase().includes(q) || name.includes(q);
    });
  }, [accounts, search]);

  const defaultTab = showComptes ? "comptes" : "parametres";

  async function handleSync() {
    if (!canEditAdmin) {
      toast.error("Droits d'édition Administration requis");
      return;
    }
    setBusySync(true);
    setSyncMsg(null);
    try {
      await syncErpCache();
      await qc.invalidateQueries();
      setSyncMsg("Synchronisation ERP réussie (employés, clients, fournisseurs).");
    } catch (err) {
      setSyncMsg(`Sync impossible : ${(err as Error).message}`);
    } finally {
      setBusySync(false);
    }
  }

  function resetCreateForm() {
    setCreateForm({ email: "", password: "", confirm: "", prenom: "", nom: "" });
    setCreateMode("full");
    setCreateRoles(defaultFullCommerceModuleRoles());
  }

  async function handleCreate() {
    const email = createForm.email.trim().toLowerCase();
    if (!email) {
      toast.error("Email requis");
      return;
    }

    try {
      if (createMode === "allow") {
        await allowEmail.mutateAsync({ email, module_roles: createRoles });
        toast.success(`Accès autorisé pour ${email}`);
      } else {
        const pwdError = validateCommercePassword(createForm.password, createForm.confirm);
        if (pwdError) {
          toast.error(pwdError);
          return;
        }
        await createAccount.mutateAsync({
          email,
          password: createForm.password,
          prenom: createForm.prenom.trim() || undefined,
          nom: createForm.nom.trim() || undefined,
          module_roles: createRoles,
        });
        toast.success(`Compte créé pour ${email}`);
      }
      setCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
    }
  }

  async function handleSaveModules() {
    if (!modulesTarget?.user_id) {
      toast.error("Ce compte n'a pas encore d'utilisateur Auth — créez le compte complet d'abord");
      return;
    }
    try {
      await setModuleRoles.mutateAsync({
        user_id: modulesTarget.user_id,
        module_roles: editRoles,
      });
      toast.success("Modules mis à jour");
      setModulesTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  }

  async function handleUpdatePassword() {
    if (!passwordTarget?.user_id) {
      toast.error("Ce compte n'a pas encore d'utilisateur Auth");
      return;
    }
    const pwdError = validateCommercePassword(passwordValue, passwordConfirm);
    if (pwdError) {
      toast.error(pwdError);
      return;
    }
    try {
      await updatePassword.mutateAsync({
        user_id: passwordTarget.user_id,
        password: passwordValue,
      });
      toast.success("Mot de passe mis à jour");
      setPasswordTarget(null);
      setPasswordValue("");
      setPasswordConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  }

  async function handleSendReset(account: CommerceAccount) {
    try {
      await sendReset.mutateAsync({
        email: account.email,
        redirect_to: `${window.location.origin}/login`,
      });
      toast.success(`Email de réinitialisation envoyé à ${account.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAccount.mutateAsync({
        email: deleteTarget.email,
        user_id: deleteTarget.user_id ?? undefined,
      });
      toast.success("Compte retiré");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  const creating = createAccount.isPending || allowEmail.isPending;

  if (!showComptes && !showParametres) {
    return (
      <AppShell title="Administration">
        <Panel title="Accès refusé">
          <p className="text-sm text-muted-foreground">
            Vous n&apos;avez pas accès au module Administration.
          </p>
        </Panel>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Administration"
      actions={
        showParametres ? (
          <Button onClick={() => void handleSync()} disabled={busySync || !canEditAdmin} variant="outline">
            {busySync ? "Sync…" : "Synchroniser ERP"}
          </Button>
        ) : null
      }
    >
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          {showComptes ? (
            <TabsTrigger value="comptes" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Comptes
            </TabsTrigger>
          ) : null}
          {showParametres ? <TabsTrigger value="parametres">Paramètres ERP</TabsTrigger> : null}
        </TabsList>

        {showComptes ? (
          <TabsContent value="comptes" className="space-y-4">
            <Panel
              title="Comptes d'accès"
              actions={
                <Button
                  size="sm"
                  onClick={() => {
                    resetCreateForm();
                    setCreateOpen(true);
                  }}
                >
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Nouveau compte
                </Button>
              }
            >
              <p className="mb-4 text-sm text-[var(--commerce-muted)]">
                Créez des comptes et définissez pour chaque module l&apos;accès{" "}
                <strong>Rien</strong>, <strong>Lecteur</strong> ou <strong>Éditeur</strong>.
              </p>

              <div className="relative mb-4 max-w-sm">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Rechercher un compte…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loadingAccounts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des comptes…
                </div>
              ) : (
                <div className="-mx-4 overflow-x-auto sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Modules</TableHead>
                        <TableHead>Auth</TableHead>
                        <TableHead>Dernière connexion</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-muted-foreground">
                            Aucun compte.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((account) => {
                          const isSelf = Boolean(
                            user?.id && account.user_id && account.user_id === user.id,
                          );
                          const roles = moduleRolesFromAccountRpc(account.module_roles);
                          return (
                            <TableRow key={account.email}>
                              <TableCell className="font-medium">
                                {account.email}
                                {isSelf ? (
                                  <span className="ml-2 text-xs text-muted-foreground">(vous)</span>
                                ) : null}
                              </TableCell>
                              <TableCell>{commerceAccountDisplayName(account)}</TableCell>
                              <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">
                                {summarizeCommerceModules(roles)}
                              </TableCell>
                              <TableCell>
                                {account.has_auth_user ? (
                                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                    Actif
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-700 dark:text-amber-400">
                                    Allowlist seule
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDate(account.last_sign_in_at)}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      disabled={!account.has_auth_user}
                                      onClick={() => {
                                        setModulesTarget(account);
                                        setEditRoles(moduleRolesFromAccountRpc(account.module_roles));
                                      }}
                                    >
                                      <Shield className="mr-2 h-4 w-4" />
                                      Modules / droits
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={!account.has_auth_user}
                                      onClick={() => {
                                        setPasswordTarget(account);
                                        setPasswordValue("");
                                        setPasswordConfirm("");
                                      }}
                                    >
                                      <KeyRound className="mr-2 h-4 w-4" />
                                      Définir le mot de passe
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => void handleSendReset(account)}
                                      disabled={sendReset.isPending}
                                    >
                                      <Mail className="mr-2 h-4 w-4" />
                                      Envoyer reset email
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      disabled={isSelf}
                                      onClick={() => setDeleteTarget(account)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Retirer l&apos;accès
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {filtered.length} compte{filtered.length !== 1 ? "s" : ""}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void refetch()}>
                  Actualiser
                </Button>
              </div>
            </Panel>
          </TabsContent>
        ) : null}

        {showParametres ? (
          <TabsContent value="parametres" className="space-y-4">
            {syncMsg ? (
              <p className="rounded-md bg-[var(--commerce-row)] px-3 py-2 text-sm">{syncMsg}</p>
            ) : null}

            <Panel title="Bridge ERP">
              <p className="text-sm text-[var(--commerce-muted)]">
                Dernière sync :{" "}
                {settings?.last_erp_sync_at
                  ? new Date(settings.last_erp_sync_at).toLocaleString("fr-FR")
                  : "jamais"}
              </p>
              <p className="mt-2 text-xs text-[var(--commerce-muted)]">
                Variables requises : <code>VITE_ERP_BRIDGE_URL</code>, <code>VITE_ERP_BRIDGE_KEY</code>{" "}
                (secret <code>COMMERCE_BRIDGE_SECRET</code> côté ERP).
              </p>
            </Panel>

            <Panel title="Sociétés d'exploitation" bodyClassName="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Bridge URL</TableHead>
                    <TableHead>Actif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {societes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold">{s.code}</TableCell>
                      <TableCell>{s.nom}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs">
                        {s.erp_bridge_url ?? "Par défaut (env)"}
                      </TableCell>
                      <TableCell>{s.actif ? "Oui" : "Non"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="border-t px-4 py-2 text-xs text-[var(--commerce-muted)]">
                Ajoutez une société dans <code>societes_exploitation</code> pour le multi-exploitant.
              </p>
            </Panel>
          </TabsContent>
        ) : null}
      </Tabs>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau compte</DialogTitle>
            <DialogDescription>
              Créez un accès et choisissez les modules (lecture / édition).
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={createMode === "full" ? "default" : "outline"}
              onClick={() => setCreateMode("full")}
            >
              Compte + mot de passe
            </Button>
            <Button
              type="button"
              size="sm"
              variant={createMode === "allow" ? "default" : "outline"}
              onClick={() => setCreateMode("allow")}
            >
              Allowlist seule
            </Button>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                autoComplete="off"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            {createMode === "full" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="create-prenom">Prénom</Label>
                    <Input
                      id="create-prenom"
                      value={createForm.prenom}
                      onChange={(e) => setCreateForm((f) => ({ ...f, prenom: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-nom">Nom</Label>
                    <Input
                      id="create-nom"
                      value={createForm.nom}
                      onChange={(e) => setCreateForm((f) => ({ ...f, nom: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">Mot de passe</Label>
                  <Input
                    id="create-password"
                    type="password"
                    autoComplete="new-password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-confirm">Confirmer</Label>
                  <Input
                    id="create-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={createForm.confirm}
                    onChange={(e) => setCreateForm((f) => ({ ...f, confirm: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                L&apos;utilisateur pourra se connecter via magic link ou Microsoft. Les modules
                s&apos;appliquent dès qu&apos;un compte Auth existe pour cet email.
              </p>
            )}

            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Modules</Label>
                <span className="text-xs text-muted-foreground">
                  {countActiveCommerceModules(createRoles)} / {COMMERCE_ALL_MODULES.length}
                </span>
              </div>
              <CommerceModuleRolePicker
                modules={COMMERCE_ALL_MODULES}
                getRole={(m) => createRoles[m]}
                onRoleChange={(module: CommerceModule, role: CommerceModuleRole) => {
                  setCreateRoles((prev) => ({ ...prev, [module]: role }));
                }}
                disabled={creating}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Annuler
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {createMode === "allow" ? "Autoriser" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!modulesTarget}
        onOpenChange={(open) => {
          if (!open) setModulesTarget(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modules / droits</DialogTitle>
            <DialogDescription>
              Droits pour {modulesTarget?.email}. Lecteur = lecture seule, Éditeur = lecture +
              écriture.
            </DialogDescription>
          </DialogHeader>
          <CommerceModuleRolePicker
            modules={COMMERCE_ALL_MODULES}
            getRole={(m) => editRoles[m]}
            onRoleChange={(module, role) => {
              setEditRoles((prev) => ({ ...prev, [module]: role }));
            }}
            disabled={setModuleRoles.isPending}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModulesTarget(null)} disabled={setModuleRoles.isPending}>
              Annuler
            </Button>
            <Button onClick={() => void handleSaveModules()} disabled={setModuleRoles.isPending}>
              {setModuleRoles.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!passwordTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordTarget(null);
            setPasswordValue("");
            setPasswordConfirm("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Définir le mot de passe</DialogTitle>
            <DialogDescription>
              Nouveau mot de passe pour {passwordTarget?.email}. Minimum 8 caractères.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="pwd-new">Nouveau mot de passe</Label>
              <Input
                id="pwd-new"
                type="password"
                autoComplete="new-password"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd-confirm">Confirmer</Label>
              <Input
                id="pwd-confirm"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordTarget(null);
                setPasswordValue("");
                setPasswordConfirm("");
              }}
              disabled={updatePassword.isPending}
            >
              Annuler
            </Button>
            <Button onClick={() => void handleUpdatePassword()} disabled={updatePassword.isPending}>
              {updatePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer l&apos;accès ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.email} sera retiré de la liste autorisée
              {deleteTarget?.has_auth_user
                ? " et son compte Auth sera supprimé."
                : "."}{" "}
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccount.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAccount.isPending}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleteAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
