import { supabase } from "@/integrations/supabase/client";
import {
  hydrateContacts,
  summarizeContacts,
  type ProspectionContact,
} from "@/lib/prospection/contacts";

export type { ProspectionContact, ProspectionContactType } from "@/lib/prospection/contacts";

export type ProspectionCommuneState = {
  status: "todo" | "inprogress" | "done" | "callback" | "refused";
  gestion: "" | "commune" | "agglo" | "syndicat";
  prestataire: string;
  /** Résumé lisible (table / CSV), synchronisé depuis `contacts`. */
  contact: string;
  contacts: ProspectionContact[];
  notes: string;
};

export type ProspectionStateMap = Record<string, ProspectionCommuneState>;

const DEFAULT_ROW: ProspectionCommuneState = {
  status: "todo",
  gestion: "",
  prestataire: "",
  contact: "",
  contacts: [],
  notes: "",
};

const YVELINES_LEGACY_PREFIX = "Yvelines (78)::";
const PROSPECTION_SUIVI_PAGE_SIZE = 1000;

type ProspectionSuiviRow = {
  commune_key?: string | null;
  ville?: string | null;
  status: string;
  gestion: string | null;
  prestataire: string | null;
  contact: string | null;
  contacts_json?: unknown;
  notes: string | null;
};

function resolveCommuneKey(row: ProspectionSuiviRow): string | null {
  if (row.commune_key) return row.commune_key;
  if (row.ville) return `${YVELINES_LEGACY_PREFIX}${row.ville}`;
  return null;
}

function stateFromRow(row: ProspectionSuiviRow): ProspectionCommuneState {
  const contacts = hydrateContacts(row.contacts_json, row.contact);
  return {
    status: (row.status as ProspectionCommuneState["status"]) || "todo",
    gestion: (row.gestion as ProspectionCommuneState["gestion"]) || "",
    prestataire: row.prestataire ?? "",
    contacts,
    contact: summarizeContacts(contacts) || (row.contact ?? ""),
    notes: row.notes ?? "",
  };
}

function legacyVilleFromKey(communeKey: string): string | null {
  if (!communeKey.startsWith(YVELINES_LEGACY_PREFIX)) return null;
  return communeKey.slice(YVELINES_LEGACY_PREFIX.length);
}

function withSyncedContactSummary(row: ProspectionCommuneState): ProspectionCommuneState {
  return {
    ...row,
    contact: summarizeContacts(row.contacts),
  };
}

async function fetchAllProspectionSuiviRows(): Promise<ProspectionSuiviRow[]> {
  const rows: ProspectionSuiviRow[] = [];
  for (let from = 0; ; from += PROSPECTION_SUIVI_PAGE_SIZE) {
    const { data, error } = await (supabase as any)
      .from("prospection_commune_suivi")
      .select("*")
      .order("commune_key")
      .range(from, from + PROSPECTION_SUIVI_PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as ProspectionSuiviRow[];
    rows.push(...page);
    if (page.length < PROSPECTION_SUIVI_PAGE_SIZE) break;
  }
  return rows;
}

export async function fetchProspectionState(): Promise<ProspectionStateMap> {
  const map: ProspectionStateMap = {};
  for (const row of await fetchAllProspectionSuiviRows()) {
    const communeKey = resolveCommuneKey(row);
    if (!communeKey) continue;
    map[communeKey] = stateFromRow(row);
  }
  return map;
}

export async function saveProspectionStateMap(map: ProspectionStateMap): Promise<void> {
  const entries = Object.entries(map);
  if (entries.length === 0) return;
  await Promise.all(entries.map(([communeKey, row]) => upsertProspectionCommune(communeKey, row)));
}

export async function upsertProspectionCommune(
  communeKey: string,
  patch: Partial<ProspectionCommuneState>,
): Promise<void> {
  const current = withSyncedContactSummary(await readCurrentRow(communeKey, patch));

  const newPayload = {
    commune_key: communeKey,
    status: current.status,
    gestion: current.gestion || null,
    prestataire: current.prestataire,
    contact: current.contact,
    contacts_json: current.contacts,
    notes: current.notes,
  };

  const { error: newSchemaError } = await (supabase as any)
    .from("prospection_commune_suivi")
    .upsert(newPayload, { onConflict: "commune_key" });

  if (!newSchemaError) return;

  const legacyVille = legacyVilleFromKey(communeKey);
  if (!legacyVille) {
    throw newSchemaError;
  }

  const { error: legacyError } = await (supabase as any).from("prospection_commune_suivi").upsert(
    {
      ville: legacyVille,
      status: current.status,
      gestion: current.gestion || null,
      prestataire: current.prestataire,
      contact: current.contact,
      contacts_json: current.contacts,
      notes: current.notes,
    },
    { onConflict: "ville" },
  );

  if (legacyError) throw legacyError;
}

async function readCurrentRow(
  communeKey: string,
  patch: Partial<ProspectionCommuneState>,
): Promise<ProspectionCommuneState> {
  const selectCols = "status, gestion, prestataire, contact, contacts_json, notes";
  const { data: byKey, error: byKeyError } = await (supabase as any)
    .from("prospection_commune_suivi")
    .select(selectCols)
    .eq("commune_key", communeKey)
    .maybeSingle();

  if (!byKeyError && byKey) {
    return { ...DEFAULT_ROW, ...stateFromRow(byKey as ProspectionSuiviRow), ...patch };
  }

  const legacyVille = legacyVilleFromKey(communeKey);
  if (legacyVille) {
    const { data: byVille, error: byVilleError } = await (supabase as any)
      .from("prospection_commune_suivi")
      .select(selectCols)
      .eq("ville", legacyVille)
      .maybeSingle();

    if (!byVilleError && byVille) {
      return { ...DEFAULT_ROW, ...stateFromRow(byVille as ProspectionSuiviRow), ...patch };
    }
  }

  return { ...DEFAULT_ROW, ...patch };
}

export function subscribeProspectionChanges(
  onRow: (communeKey: string, state: ProspectionCommuneState) => void,
): () => void {
  const channel = supabase
    .channel("prospection_commune_suivi_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "prospection_commune_suivi" },
      (payload) => {
        const row = (payload.new ?? payload.old) as ProspectionSuiviRow | null;
        if (!row) return;
        const communeKey = resolveCommuneKey(row);
        if (!communeKey) return;
        onRow(communeKey, stateFromRow(row));
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
