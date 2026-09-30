import type { ProspectionCommuneState } from "@/lib/prospection/api";
import type { ProspectionMapColorMode } from "@/lib/prospection/mapTypes";
import { canonicalizePrestataire } from "@/lib/prospection/prestataireNomenclature";
import { GESTION_OPTIONS, STATUS_OPTIONS } from "@/lib/prospection/ui";

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
  aucun: "#64748b",
};

const PORTE_COLORS: Record<ProspectionCommuneState["porteEntree"], string> = {
  "": "#cbd5e1",
  oui: "#16a34a",
  non: "#dc2626",
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
    case "prestataireVoirie":
      return prestataireColor(state.prestataireVoirie);
    case "gestion":
      return GESTION_COLORS[state.gestion];
    case "gestionVoirie":
      return GESTION_COLORS[state.gestionVoirie];
    case "porte":
      return PORTE_COLORS[state.porteEntree];
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
    case "prestataireVoirie":
      return normalizePrestataireName(state.prestataireVoirie) || "Non renseigné";
    case "gestion":
      return GESTION_OPTIONS.find((o) => o.value === state.gestion)?.label ?? "?";
    case "gestionVoirie":
      return GESTION_OPTIONS.find((o) => o.value === state.gestionVoirie)?.label ?? "?";
    case "porte":
      return state.porteEntree === "oui" ? "Porte d'entrée : oui" : state.porteEntree === "non" ? "Porte d'entrée : non" : "Non renseigné";
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

export function porteLegendItems() {
  return [
    { label: "Oui", color: PORTE_COLORS.oui },
    { label: "Non", color: PORTE_COLORS.non },
  ];
}

export function statutLegendItems() {
  return (
    Object.entries(STATUS_COLORS) as [ProspectionCommuneState["status"], string][]
  ).map(([status, color]) => ({ label: status, color }));
}

export const CATEGORY_NONE = "__none__";

export type MapCategory = { key: string; label: string; color: string };

/** Clé de catégorie d'une commune pour les modes « à catégories » (clic dans la légende). */
export function mapCategoryKey(
  mode: ProspectionMapColorMode,
  state: ProspectionCommuneState,
): string {
  switch (mode) {
    case "prestataire":
      return normalizePrestataireName(state.prestataire) || CATEGORY_NONE;
    case "prestataireVoirie":
      return normalizePrestataireName(state.prestataireVoirie) || CATEGORY_NONE;
    case "gestion":
      return state.gestion || CATEGORY_NONE;
    case "gestionVoirie":
      return state.gestionVoirie || CATEGORY_NONE;
    case "porte":
      return state.porteEntree || CATEGORY_NONE;
    case "statut":
      return state.status;
    default:
      return CATEGORY_NONE;
  }
}

/** Catégories fixes affichées (et cliquables) dans la légende, dans l'ordre. */
export function mapCategories(mode: ProspectionMapColorMode): MapCategory[] {
  const unset = { key: CATEGORY_NONE, label: "Non renseigné", color: UNSET_COLOR };
  switch (mode) {
    case "gestion":
    case "gestionVoirie":
      return [
        ...GESTION_OPTIONS.filter((o) => o.value !== "").map((o) => ({
          key: o.value,
          label: o.label,
          color: GESTION_COLORS[o.value],
        })),
        unset,
      ];
    case "porte":
      return [
        { key: "oui", label: "Oui", color: PORTE_COLORS.oui },
        { key: "non", label: "Non", color: PORTE_COLORS.non },
        unset,
      ];
    case "statut":
      return (Object.entries(STATUS_COLORS) as [ProspectionCommuneState["status"], string][]).map(
        ([status, color]) => ({
          key: status,
          label: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
          color,
        }),
      );
    default:
      return [];
  }
}
