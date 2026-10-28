/** Personnes pouvant suivre une commune (colonne « Qui »). */
export const PROSPECTION_RESPONSABLES = ["Rida", "Said", "Mathieu"] as const;

export type ProspectionResponsable = (typeof PROSPECTION_RESPONSABLES)[number];

const RESPONSABLE_CLASS: Record<string, string> = {
  Rida: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  Said: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  Mathieu: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
};

export function responsableBadgeClass(name: string): string {
  return RESPONSABLE_CLASS[name] ?? "bg-muted text-foreground";
}

/** Nettoie une valeur venant de la base : tableau de chaînes, sans doublon, dans l'ordre de la liste. */
export function normalizeResponsables(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names = new Set(value.filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim()));
  const known = PROSPECTION_RESPONSABLES.filter((n) => names.has(n));
  const others = [...names].filter((n) => !(PROSPECTION_RESPONSABLES as readonly string[]).includes(n)).sort();
  return [...known, ...others];
}

export function toggleResponsable(current: string[], name: string): string[] {
  return normalizeResponsables(current.includes(name) ? current.filter((n) => n !== name) : [...current, name]);
}

export function formatResponsables(list: string[]): string {
  return list.join(", ");
}
