/** Affiche un montant saisi avec espaces milliers (fr), ex. 2000000 → "2 000 000". */
export function formatCeAmountDisplay(raw: string): string {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return "";
  const negative = cleaned.startsWith("-");
  const body = negative ? cleaned.slice(1) : cleaned;
  const [intPart = "", decPart] = body.split(".");
  if (!/^\d*$/.test(intPart) || (decPart != null && !/^\d*$/.test(decPart))) {
    return raw;
  }
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  const sign = negative ? "-" : "";
  if (decPart == null) return `${sign}${grouped}`;
  return `${sign}${grouped},${decPart}`;
}

/** Parse la saisie affichée → chaîne numérique stockée ("2 000 000,5" → "2000000.5"). */
export function parseCeAmountInput(display: string): string {
  const cleaned = display
    .replace(/[\s\u00a0\u202f]/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return "";
  const negative = cleaned.startsWith("-");
  const body = negative ? cleaned.slice(1) : cleaned;
  const parts = body.split(".");
  const intPart = (parts[0] ?? "").replace(/\D/g, "");
  const decPart = parts.length > 1 ? (parts[1] ?? "").replace(/\D/g, "").slice(0, 2) : null;
  if (!intPart && decPart == null) return "";
  const sign = negative ? "-" : "";
  if (decPart == null) return `${sign}${intPart}`;
  return `${sign}${intPart}.${decPart}`;
}
