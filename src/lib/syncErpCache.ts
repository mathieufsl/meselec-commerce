import { supabase } from "@/integrations/supabase/client";
import {
  fetchCommerceBridge,
  postCommerceHandoff,
  type HandoffPayload,
} from "@/lib/erpBridge";
import type { ErpEmploye } from "@/lib/commerceTypes";

export async function syncErpCache(): Promise<void> {
  const [employes, clients, fournisseurs] = await Promise.all([
    fetchCommerceBridge<ErpEmploye[]>("employes"),
    fetchCommerceBridge<unknown[]>("clients"),
    fetchCommerceBridge<unknown[]>("fournisseurs"),
  ]);

  const now = new Date().toISOString();

  await Promise.all([
    supabase
      .from("erp_cache_employes")
      .upsert({ id: 1, rows: employes as never, refreshed_at: now }),
    supabase
      .from("erp_cache_clients")
      .upsert({ id: 1, rows: clients as never, refreshed_at: now }),
    supabase
      .from("erp_cache_fournisseurs")
      .upsert({ id: 1, rows: fournisseurs as never, refreshed_at: now }),
    supabase.from("commerce_settings").upsert({ id: 1, last_erp_sync_at: now }),
    supabase.from("erp_cache_sync_runs").insert({
      source: "commerce-bridge",
      status: "ok",
      details: {
        employes: employes.length,
        clients: clients.length,
        fournisseurs: fournisseurs.length,
      },
    }),
  ]);
}

export async function executeHandoff(payload: HandoffPayload) {
  return postCommerceHandoff(payload);
}
