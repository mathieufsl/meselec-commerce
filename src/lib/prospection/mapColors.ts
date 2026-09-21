import type { ProspectionCommuneState } from "@/lib/prospection/api";
import type { ProspectionMapColorMode } from "@/lib/prospection/mapTypes";
import { canonicalizePrestataire } from "@/lib/prospection/prestataireNomenclature";
import { GESTION_OPTIONS } from "@/lib/prospection/ui";

const PRESTATAIRE_PALETTE = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#be185d",
  "#4f46e5",
  "#ca8a04",
  "#0d9488",
  "#7c3aed",
  "#e11d48",
  "#0284c7",
  "#65a30d",
  "#c026d3",
  "#d97706",
  "#059669",
  "#6366f1",
  "#db2777",
  "#0891b2",
];

const GESTION_COLORS: Record<ProspectionCommuneState["gestion"], string> = {
  "": "#94a3b8",
  commune: "#2563eb",
  agglo: "#16a34a",
  syndicat: "#9333ea",
};

const STATUS_COLORS: Record<ProspectionCommuneState["status"], string> = {
  todo: "#94a3b8",
  inprogress: "#2563eb",
  done: "#16a34a",
  callback: "#ea580c",
  refused: "#dc2626",
};

export const UNSET_COLOR = "#cbd5e1";
export const DIMMED_COLOR = "#e2e8f0";
export const HIGHLIGHT_RING = "#0f172a";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function normalizePrestataireName(name: string): string {
  return canonicalizePrestataire(name);
}

export function prestataireColor(name: string): string {
  const normalized = normalizePrestataireName(name);
  if (!normalized) return UNSET_COLOR;
  return PRESTATAIRE_PALETTE[hashString(normalized.toLowerCase()) % PRESTATAIRE_PALETTE.length];
}

export function colorForMapValue(
  mode: ProspectionMapColorMode,
  state: ProspectionCommuneState,
): string {
  switch (mode) {
    case "prestataire":
      return prestataireColor(state.prestataire);
    case "gestion":
      return GESTION_COLORS[state.gestion];
    case "statut":
      return STATUS_COLORS[state.status];
    default:
      return UNSET_COLOR;
  }
}

export function mapValueLabel(
  mode: ProspectionMapColorMode,
  state: ProspectionCommuneState,
): string {
  switch (mode) {
    case "prestataire":
      return normalizePrestataireName(state.prestataire) || "Non renseigné";
    case "gestion":
      return GESTION_OPTIONS.find((o) => o.value === state.gestion)?.label ?? "?";
    case "statut":
      return state.status;
    default:
      return "";
  }
}

export function gestionLegendItems() {
  return GESTION_OPTIONS.filter((o) => o.value !== "").map((o) => ({
    label: o.label,
    color: GESTION_COLORS[o.value],
  }));
}

export function statutLegendItems() {
  return (
    Object.entries(STATUS_COLORS) as [ProspectionCommuneState["status"], string][]
  ).map(([status, color]) => ({ label: status, color }));
}
