const ERP_BRIDGE_URL = import.meta.env.VITE_ERP_BRIDGE_URL as string | undefined;
const ERP_BRIDGE_KEY = import.meta.env.VITE_ERP_BRIDGE_KEY as string | undefined;

export type CommerceBridgeGetEndpoint = "employes" | "clients" | "fournisseurs";

export type HandoffPayload = {
  ao_id: string;
  reference: string;
  titre: string;
  client: string;
  agence?: string | null;
  lieu?: string | null;
  type_intervention?: string | null;
  montant_devis?: number | null;
  charge_affaires_id?: string | null;
  lignes_chiffrage?: Array<{
    description: string;
    quantite: number;
    prix_unitaire: number;
    total: number;
    ordre?: number;
  }>;
  trigger_numero_affaire?: boolean;
};

export type HandoffResult = {
  chantier_id: string;
  chiffrage_id: string | null;
  numero_affaire_demande_id: string | null;
};

function requireBridgeConfig(): { url: string; key: string } {
  if (!ERP_BRIDGE_URL) throw new Error("VITE_ERP_BRIDGE_URL manquante");
  if (!ERP_BRIDGE_KEY) throw new Error("VITE_ERP_BRIDGE_KEY manquante");
  return { url: ERP_BRIDGE_URL, key: ERP_BRIDGE_KEY };
}

export async function fetchCommerceBridge<T = unknown>(
  endpoint: CommerceBridgeGetEndpoint,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const { url, key } = requireBridgeConfig();
  const bridgeUrl = new URL(url);
  bridgeUrl.searchParams.set("endpoint", endpoint);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null) bridgeUrl.searchParams.set(k, String(v));
  }

  const resp = await fetch(bridgeUrl.toString(), {
    method: "GET",
    headers: { "x-commerce-bridge-key": key, Accept: "application/json" },
  });

  const payload = (await resp.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    data?: T;
  };
  if (!resp.ok || payload.success === false) {
    throw new Error(payload.error || `Commerce bridge HTTP ${resp.status}`);
  }
  return payload.data as T;
}

export async function postCommerceHandoff(payload: HandoffPayload): Promise<HandoffResult> {
  const { url, key } = requireBridgeConfig();
  const bridgeUrl = new URL(url);
  bridgeUrl.searchParams.set("endpoint", "handoff");

  const resp = await fetch(bridgeUrl.toString(), {
    method: "POST",
    headers: {
      "x-commerce-bridge-key": key,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await resp.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    data?: HandoffResult;
  };
  if (!resp.ok || body.success === false) {
    throw new Error(body.error || `Handoff HTTP ${resp.status}`);
  }
  if (!body.data?.chantier_id) throw new Error("Handoff sans chantier_id");
  return body.data;
}
