import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CommerceModuleRolesMap } from "@/lib/commerceModuleRoles";

export type CommerceAccount = {
  email: string;
  user_id: string | null;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  allowed_at: string;
  last_sign_in_at: string | null;
  has_auth_user: boolean;
  module_roles: Record<string, string>;
};

type ManageResult = {
  success?: boolean;
  error?: string;
  user_id?: string;
  email?: string;
};

async function parseInvokeError(error: { message: string }, data: unknown): Promise<string> {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as ManageResult).error === "string"
  ) {
    return (data as ManageResult).error as string;
  }
  try {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const body = (await ctx.json()) as ManageResult;
      if (body?.error) return body.error;
    }
  } catch {
    /* ignore */
  }
  return error.message || "Erreur edge function";
}

async function invokeManage(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("commerce-manage-accounts", {
    body: { action, ...body },
  });
  const result = data as ManageResult | null;
  if (error) throw new Error(await parseInvokeError(error, data));
  if (!result?.success) throw new Error(result?.error || "Erreur");
  return result;
}

export function useCommerceAccounts(enabled = true) {
  return useQuery({
    queryKey: ["commerce-accounts"],
    enabled,
    queryFn: async (): Promise<CommerceAccount[]> => {
      const { data, error } = await supabase.rpc("commerce_list_accounts");
      if (error) throw error;
      return ((data ?? []) as Array<Omit<CommerceAccount, "module_roles"> & { module_roles?: unknown }>).map(
        (row) => ({
          ...row,
          module_roles:
            row.module_roles && typeof row.module_roles === "object" && !Array.isArray(row.module_roles)
              ? (row.module_roles as Record<string, string>)
              : {},
        }),
      );
    },
  });
}

export function useCreateCommerceAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      email: string;
      password: string;
      prenom?: string;
      nom?: string;
      telephone?: string;
      module_roles?: CommerceModuleRolesMap;
    }) => invokeManage("create", input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["commerce-accounts"] }),
  });
}

export function useAllowCommerceEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; module_roles?: CommerceModuleRolesMap }) =>
      invokeManage("allow_email", input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["commerce-accounts"] }),
  });
}

export function useSetCommerceModuleRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; module_roles: CommerceModuleRolesMap }) => {
      const { error } = await supabase.rpc("commerce_set_user_module_roles", {
        p_user_id: input.user_id,
        p_module_roles: input.module_roles,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["commerce-accounts"] });
      void qc.invalidateQueries({ queryKey: ["commerce-session"] });
    },
  });
}

export function useUpdateCommerceAccountPassword() {
  return useMutation({
    mutationFn: (input: { user_id: string; password: string }) =>
      invokeManage("update_password", input),
  });
}

export function useSendCommercePasswordReset() {
  return useMutation({
    mutationFn: (input: { email: string; redirect_to?: string }) =>
      invokeManage("send_reset", input),
  });
}

export function useUpdateCommerceAccountProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      user_id: string;
      prenom?: string;
      nom?: string;
      telephone?: string;
    }) => invokeManage("update_profile", input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["commerce-accounts"] }),
  });
}

export function useDeleteCommerceAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email?: string; user_id?: string }) => invokeManage("delete", input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["commerce-accounts"] }),
  });
}
