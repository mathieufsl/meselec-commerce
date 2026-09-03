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
