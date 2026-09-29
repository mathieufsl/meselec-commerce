import { UNSET_COLOR } from "@/lib/prospection/mapColors";

export type NuanceInfo = { code: string; label: string; color: string };

/** Nuances politiques du ministère de l'Intérieur (codes rencontrés dans le référentiel). */
const NUANCES: NuanceInfo[] = [
  { code: "PCF", label: "Parti communiste français", color: "#b91c1c" },
  { code: "LFI", label: "La France insoumise", color: "#dc2626" },
  { code: "LUG", label: "Liste union de la gauche", color: "#ef4444" },
  { code: "LSOC", label: "Liste socialiste", color: "#f472b6" },
  { code: "SOC", label: "Socialiste", color: "#f472b6" },
  { code: "PS", label: "Parti socialiste", color: "#f472b6" },
  { code: "UG", label: "Union de la gauche", color: "#ef4444" },
  { code: "LDVG", label: "Divers gauche", color: "#f97316" },
  { code: "LECO", label: "Écologiste", color: "#16a34a" },
  { code: "ECO", label: "Écologiste", color: "#16a34a" },
  { code: "LVEC", label: "Les Verts / Écologistes", color: "#16a34a" },
  { code: "LDVC", label: "Divers centre", color: "#eab308" },
  { code: "LUC", label: "Liste union du centre", color: "#facc15" },
  { code: "UC", label: "Union du centre", color: "#facc15" },
  { code: "MODEM", label: "MoDem", color: "#f59e0b" },
  { code: "LLE", label: "Liste Renaissance / majorité présidentielle", color: "#f59e0b" },
  { code: "UDI", label: "UDI", color: "#38bdf8" },
  { code: "LUD", label: "Liste union de la droite", color: "#2563eb" },
  { code: "LLR", label: "Les Républicains", color: "#1d4ed8" },
  { code: "LR", label: "Les Républicains", color: "#1d4ed8" },
  { code: "LDVD", label: "Divers droite", color: "#3b82f6" },
  { code: "LDSV", label: "Droite souverainiste", color: "#1e3a8a" },
  { code: "LDVE", label: "Divers extrême droite", color: "#1e293b" },
  { code: "LDIV", label: "Divers", color: "#a855f7" },
  { code: "SE", label: "Sans étiquette", color: "#94a3b8" },
];

const BY_CODE = new Map(NUANCES.map((n) => [n.code, n]));

export const NUANCE_NONE = "__none__";

export function nuanceKey(nuance: string): string {
  return nuance.trim().toUpperCase() || NUANCE_NONE;
}

export function nuanceColor(nuance: string): string {
  return BY_CODE.get(nuanceKey(nuance))?.color ?? UNSET_COLOR;
}

export function nuanceLabel(nuance: string): string {
  const key = nuanceKey(nuance);
  if (key === NUANCE_NONE) return "Non renseigné";
  return BY_CODE.get(key)?.label ?? key;
}

/** Ordre d'affichage : gauche → centre → droite → divers. */
export function sortNuances(codes: string[]): string[] {
  const order = new Map(NUANCES.map((n, i) => [n.code, i]));
  return [...codes].sort(
    (a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999) || a.localeCompare(b, "fr"),
  );
}

export function parseNuanceFilter(value: string): Set<string> {
  return new Set(value.split(",").map((s) => s.trim()).filter(Boolean));
}

export function serializeNuanceFilter(set: Set<string>): string {
  return [...set].join(",");
}
