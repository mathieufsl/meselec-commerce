import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { CommerceModule } from "@/lib/commerceModuleRoles";

export type CommerceSessionAcl = {
  hasAccess: boolean;
  modules: CommerceModule[];
  editorModules: CommerceModule[];
  canManageAccounts: boolean;
};

function parseSessionAcl(raw: unknown): CommerceSessionAcl {
  const data = (raw ?? {}) as {
    has_access?: boolean;
    modules?: string[] | null;
    editor_modules?: string[] | null;
    can_manage_accounts?: boolean;
  };
  return {
    hasAccess: Boolean(data.has_access),
    modules: Array.isArray(data.modules) ? (data.modules as CommerceModule[]) : [],
    editorModules: Array.isArray(data.editor_modules)
      ? (data.editor_modules as CommerceModule[])
      : [],
    canManageAccounts: Boolean(data.can_manage_accounts),
  };
}

export function useCommerceAuth() {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setBooting(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setBooting(false);
      void qc.invalidateQueries();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  const sessionQuery = useQuery({
    queryKey: ["commerce-session", session?.user?.id],
    enabled: Boolean(session?.user),
    queryFn: async (): Promise<CommerceSessionAcl> => {
      const { data, error } = await supabase.rpc("commerce_get_my_session");
      if (error) {
        // RPC absente (PGRST202) uniquement : ancien allowlist sans modules.
        const missingRpc =
          error.code === "PGRST202" || /commerce_get_my_session/i.test(error.message);
        if (!missingRpc) throw error;

        const { data: access, error: accessError } = await supabase.rpc("commerce_has_access");
        if (accessError) throw error;
        const full: CommerceModule[] = [
          "dashboard",
          "appels_offres",
          "ce",
          "catalogues",
          "fournisseurs",
          "prospection",
          "admin",
        ];
        return {
          hasAccess: Boolean(access),
          modules: full,
          editorModules: full,
          canManageAccounts: Boolean(access),
        };
      }
      return parseSessionAcl(data);
    },
  });

  const acl = sessionQuery.data;

  return {
    session,
    user: session?.user ?? null,
    booting,
    hasAccess: acl?.hasAccess ?? false,
    modules: acl?.modules ?? [],
    editorModules: acl?.editorModules ?? [],
    canManageAccounts: acl?.canManageAccounts ?? false,
    hasModule: (module: CommerceModule) => (acl?.modules ?? []).includes(module),
    hasEditorAccess: (module: CommerceModule) => (acl?.editorModules ?? []).includes(module),
    checkingAccess: sessionQuery.isLoading && Boolean(session),
    signOut: () => supabase.auth.signOut(),
  };
}

export { userDisplayName } from "@/lib/userDisplay";
