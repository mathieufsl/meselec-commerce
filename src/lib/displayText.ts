/** Affichage UI : remplace les tirets cadratin / double tiret par une virgule. */
export function cleanDisplaySeparators(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/\s*--\s*/g, ", ")
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*$/g, "")
    .trim();
}
