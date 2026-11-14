import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const refreshVeille = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fenetreJours?: number; idfSeulement?: boolean }) => ({
    fenetreJours: Math.min(Math.max(input.fenetreJours ?? 7, 1), 60),
    idfSeulement: input.idfSeulement ?? true,
  }))
  .handler(async ({ data, context }) => {
    const { collecterVeille } = await import("@/lib/veilleCollect.server");
    const res = await collecterVeille(context.supabase, data);
    if (!res.ok) {
      return {
        ok: false as const,
        error: res.error,
        collectees: res.collectees,
        retenues: res.retenues,
        nouvelles: res.nouvelles,
      };
    }
    return {
      ok: true as const,
      collectees: res.collectees,
      retenues: res.retenues,
      nouvelles: res.nouvelles,
    };
  });

export const qualifierVeille = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids?: string[]; limit?: number }) => ({
    ids: Array.isArray(input.ids) ? input.ids.filter((i) => typeof i === "string").slice(0, 200) : undefined,
    limit: Math.min(Math.max(input.limit ?? 50, 1), 200),
  }))
  .handler(async ({ data, context }) => {
    const { qualifierAnnonces } = await import("@/lib/veilleQualif.server");
    return qualifierAnnonces(context.supabase, data);
  });

export const rattraperVeilleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jours?: number; idwebs?: string[] }) => ({
    jours: Math.min(Math.max(input.jours ?? 14, 1), 60),
    idwebs: Array.isArray(input.idwebs)
      ? input.idwebs.filter((i) => typeof i === "string" && /^[\w-]+$/.test(i)).slice(0, 100)
      : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { rattraperVeille } = await import("@/lib/veilleQualif.server");
    return rattraperVeille(context.supabase, data);
  });
