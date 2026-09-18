import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

type Action =
  | "create"
  | "allow_email"
  | "update_password"
  | "send_reset"
  | "update_profile"
  | "delete"
  | "set_modules";

interface Payload {
  action: Action;
  email?: string;
  password?: string;
  user_id?: string;
  prenom?: string | null;
  nom?: string | null;
  telephone?: string | null;
  redirect_to?: string;
  module_roles?: Record<string, string> | null;
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findUserByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string; email?: string } | null> {
  const target = normalizeEmail(email);
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const limited = await enforceRateLimit(req, {
    prefix: "commerce-manage-accounts",
    limit: 40,
    windowMs: 60 * 60 * 1000,
    corsHeaders,
    identifierMode: "authorization",
  });
  if (limited) return limited.response;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Non authentifié" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "Configuration backend manquante" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ success: false, error: "Session invalide" }, 401);
    }

    const { data: canManage, error: accessError } = await userClient.rpc(
      "commerce_can_manage_accounts",
    );
    if (accessError) {
      // Fallback si migration modules pas encore déployée
      const { data: hasAccess, error: legacyError } = await userClient.rpc("commerce_has_access");
      if (legacyError) {
        return jsonResponse({ success: false, error: accessError.message }, 500);
      }
      if (!hasAccess) {
        return jsonResponse({ success: false, error: "Accès commerce requis" }, 403);
      }
    } else if (!canManage) {
      return jsonResponse(
        { success: false, error: "Réservé aux gestionnaires de comptes" },
        403,
      );
    }

    const payload = (await req.json().catch(() => ({}))) as Payload;
    const { action } = payload;
    if (!action) {
      return jsonResponse({ success: false, error: "action requise" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    async function applyModuleRoles(targetUserId: string | null) {
      if (!targetUserId || payload.module_roles == null) return null;
      const { error } = await userClient.rpc("commerce_set_user_module_roles", {
        p_user_id: targetUserId,
        p_module_roles: payload.module_roles,
      });
      return error;
    }

    switch (action) {
      case "create": {
        const email = payload.email ? normalizeEmail(payload.email) : "";
        const { password, prenom, nom, telephone } = payload;
        if (!email || !isValidEmail(email) || !password) {
          return jsonResponse({ success: false, error: "email et mot de passe requis" }, 400);
        }
        if (password.length < 8) {
          return jsonResponse(
            { success: false, error: "Le mot de passe doit contenir au moins 8 caractères" },
            400,
          );
        }

        const { error: allowErr } = await adminClient
          .from("commerce_allowed_emails")
          .upsert({ email }, { onConflict: "email" });
        if (allowErr) {
          return jsonResponse({ success: false, error: allowErr.message }, 500);
        }

        let userId: string | null = null;
        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: prenom?.trim() || null,
            full_name: [prenom, nom].filter(Boolean).join(" ") || null,
          },
        });

        if (createError) {
          if (createError.message?.toLowerCase().includes("already")) {
            const existing = await findUserByEmail(adminClient, email);
            if (!existing) {
              return jsonResponse({ success: false, error: createError.message }, 400);
            }
            const { error: updErr } = await adminClient.auth.admin.updateUserById(existing.id, {
              password,
              email_confirm: true,
              user_metadata: {
                first_name: prenom?.trim() || null,
                full_name: [prenom, nom].filter(Boolean).join(" ") || null,
              },
            });
            if (updErr) return jsonResponse({ success: false, error: updErr.message }, 500);
            userId = existing.id;
          } else {
            return jsonResponse({ success: false, error: createError.message }, 400);
          }
        } else {
          userId = created.user.id;
        }

        if (userId) {
          const { error: profileErr } = await adminClient.from("commerce_profiles").upsert(
            {
              user_id: userId,
              prenom: prenom?.trim() || null,
              nom: nom?.trim() || null,
              telephone: telephone?.trim() || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
          if (profileErr) {
            return jsonResponse({ success: false, error: profileErr.message }, 500);
          }

          const moduleErr = await applyModuleRoles(userId);
          if (moduleErr) {
            return jsonResponse({ success: false, error: moduleErr.message }, 500);
          }
        }

        return jsonResponse({ success: true, user_id: userId, email });
      }

      case "allow_email": {
        const email = payload.email ? normalizeEmail(payload.email) : "";
        if (!email || !isValidEmail(email)) {
          return jsonResponse({ success: false, error: "email valide requis" }, 400);
        }
        const { error: allowErr } = await adminClient
          .from("commerce_allowed_emails")
          .upsert({ email }, { onConflict: "email" });
        if (allowErr) {
          return jsonResponse({ success: false, error: allowErr.message }, 500);
        }

        const existing = await findUserByEmail(adminClient, email);
        if (existing && payload.module_roles != null) {
          const moduleErr = await applyModuleRoles(existing.id);
          if (moduleErr) {
            return jsonResponse({ success: false, error: moduleErr.message }, 500);
          }
        }

        return jsonResponse({ success: true, email, user_id: existing?.id });
      }

      case "set_modules": {
        const targetUserId = payload.user_id ?? null;
        if (!targetUserId) {
          return jsonResponse({ success: false, error: "user_id requis" }, 400);
        }
        if (payload.module_roles == null) {
          return jsonResponse({ success: false, error: "module_roles requis" }, 400);
        }
        const moduleErr = await applyModuleRoles(targetUserId);
        if (moduleErr) {
          return jsonResponse({ success: false, error: moduleErr.message }, 500);
        }
        return jsonResponse({ success: true, user_id: targetUserId });
      }

      case "update_password": {
        const { user_id, password } = payload;
        if (!user_id || !password) {
          return jsonResponse({ success: false, error: "user_id et mot de passe requis" }, 400);
        }
        if (password.length < 8) {
          return jsonResponse(
            { success: false, error: "Le mot de passe doit contenir au moins 8 caractères" },
            400,
          );
        }
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(user_id, {
          password,
        });
        if (updateErr) return jsonResponse({ success: false, error: updateErr.message }, 500);
        return jsonResponse({ success: true });
      }

      case "send_reset": {
        const email = payload.email ? normalizeEmail(payload.email) : "";
        if (!email || !isValidEmail(email)) {
          return jsonResponse({ success: false, error: "email valide requis" }, 400);
        }
        const redirectTo =
          payload.redirect_to?.trim() ||
          Deno.env.get("COMMERCE_AUTH_REDIRECT_URL")?.trim() ||
          "https://rms-commerce.lovable.app/login";

        const { error: resetErr } = await adminClient.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (resetErr) return jsonResponse({ success: false, error: resetErr.message }, 500);
        return jsonResponse({ success: true });
      }

      case "update_profile": {
        const { user_id, prenom, nom, telephone } = payload;
        if (!user_id) {
          return jsonResponse({ success: false, error: "user_id requis" }, 400);
        }
        const { error: profileErr } = await adminClient.from("commerce_profiles").upsert(
          {
            user_id,
            prenom: prenom?.trim() || null,
            nom: nom?.trim() || null,
            telephone: telephone?.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
        if (profileErr) {
          return jsonResponse({ success: false, error: profileErr.message }, 500);
        }
        await adminClient.auth.admin.updateUserById(user_id, {
          user_metadata: {
            first_name: prenom?.trim() || null,
            full_name: [prenom, nom].filter(Boolean).join(" ") || null,
          },
        });
        return jsonResponse({ success: true });
      }

      case "delete": {
        const email = payload.email ? normalizeEmail(payload.email) : "";
        let targetUserId = payload.user_id ?? null;

        if (!targetUserId && email) {
          const existing = await findUserByEmail(adminClient, email);
          targetUserId = existing?.id ?? null;
        }

        if (!email && !targetUserId) {
          return jsonResponse({ success: false, error: "email ou user_id requis" }, 400);
        }

        if (targetUserId && targetUserId === user.id) {
          return jsonResponse(
            { success: false, error: "Vous ne pouvez pas supprimer votre propre compte" },
            400,
          );
        }

        let emailToRevoke = email;
        if (!emailToRevoke && targetUserId) {
          const { data: authUser } = await adminClient.auth.admin.getUserById(targetUserId);
          emailToRevoke = authUser.user?.email ? normalizeEmail(authUser.user.email) : "";
        }

        if (emailToRevoke) {
          await adminClient.from("commerce_allowed_emails").delete().eq("email", emailToRevoke);
        }

        if (targetUserId) {
          await adminClient.from("commerce_user_module_access").delete().eq("user_id", targetUserId);
          await adminClient.from("commerce_profiles").delete().eq("user_id", targetUserId);
          const { error: delErr } = await adminClient.auth.admin.deleteUser(targetUserId);
          if (delErr) {
            return jsonResponse({
              success: false,
              error: `Accès retiré, mais suppression Auth impossible : ${delErr.message}`,
            }, 500);
          }
        }

        return jsonResponse({ success: true });
      }

      default:
        return jsonResponse({ success: false, error: "action invalide" }, 400);
    }
  } catch (err) {
    console.error("commerce-manage-accounts error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
