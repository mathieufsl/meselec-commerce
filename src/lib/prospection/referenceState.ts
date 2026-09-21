import { PROSPECTION_REFERENCE_SEED } from "@/data/prospectionReferenceSeed";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import { canonicalizePrestataire } from "@/lib/prospection/prestataireNomenclature";

const DEFAULT_ROW: ProspectionCommuneState = {
  status: "todo",
  gestion: "",
  prestataire: "",
  contact: "",
  contacts: [],
  notes: "",
};

/** Fusionne l'état serveur avec le seed CSV (le serveur prime si renseigné). */
export function mergeProspectionState(
  communeKey: string,
  serverState: ProspectionCommuneState | undefined,
): ProspectionCommuneState {
  const seed = PROSPECTION_REFERENCE_SEED[communeKey];
  const server = serverState ?? DEFAULT_ROW;

  if (!seed) return server;

  const seedStatus =
    seed.status === "todo" ||
    seed.status === "inprogress" ||
    seed.status === "done" ||
    seed.status === "callback" ||
    seed.status === "refused"
      ? seed.status
      : undefined;

  return {
    ...DEFAULT_ROW,
    status: server.status !== "todo" ? server.status : seedStatus ?? server.status,
    gestion: server.gestion || seed.gestion || "",
    prestataire: server.prestataire || (seed.prestataire ? canonicalizePrestataire(seed.prestataire) : ""),
    contact: server.contact || seed.contact || "",
    contacts: server.contacts.length > 0 ? server.contacts : [],
    notes: server.notes || seed.notes || "",
  };
}

export function hasReferenceSeed(communeKey: string): boolean {
  return Boolean(PROSPECTION_REFERENCE_SEED[communeKey]);
}
