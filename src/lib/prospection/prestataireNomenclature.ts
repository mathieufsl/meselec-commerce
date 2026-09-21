import {
  PROSPECTION_PRESTATAIRE_ALIASES,
  PROSPECTION_PRESTATAIRE_NOMENCLATURE,
} from "@/data/prospectionPrestataireNomenclature";

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const NOISE_PATTERNS = [
  /^mail/i,
  /^envoy/i,
  /^message/i,
  /^mess /i,
  /^laiss/i,
  /^non\b/i,
  /^ne sa/i,
  /^n\.?c\.?$/i,
  /^confidentiel$/i,
  /^departement$/i,
  /^services?$/i,
  /^insee$/i,
  /^il en a pas$/i,
  /^\d[\d\s]{5,}$/,
];

export function isValidPrestataire(name: string): boolean {
  const normalized = normalizeKey(name);
  if (!normalized || normalized.length < 2) return false;
  return !NOISE_PATTERNS.some((pattern) => pattern.test(normalized));
}

const aliasToCanonical = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(PROSPECTION_PRESTATAIRE_ALIASES)) {
  aliasToCanonical.set(normalizeKey(canonical), canonical);
  for (const alias of aliases) {
    aliasToCanonical.set(normalizeKey(alias), canonical);
  }
}

function canonicalizeSinglePrestataire(trimmed: string): string {
  if (!trimmed || !isValidPrestataire(trimmed)) return "";

  const direct = aliasToCanonical.get(normalizeKey(trimmed));
  if (direct) return direct;

  if (/^eiffage/i.test(trimmed)) return "EES";
  if (/^bouygues/i.test(trimmed)) return "Bouygues";
  if (/citeos/i.test(trimmed)) return "Citeos";
  if (/satelec/i.test(trimmed)) return "Satelec";
  if (/^spie/i.test(trimmed)) return "Spie";

  const exact = PROSPECTION_PRESTATAIRE_NOMENCLATURE.find(
    (item) => normalizeKey(item) === normalizeKey(trimmed),
  );
  if (exact && isValidPrestataire(exact)) return exact;
  return isValidPrestataire(trimmed) ? trimmed : "";
}

export function canonicalizePrestataire(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  if (/[+/]| et /i.test(trimmed)) {
    const parts = trimmed
      .split(/\s*\+\s*|[,/]| et /i)
      .map((part) => canonicalizeSinglePrestataire(part.trim()))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" + ") : "";
  }

  return canonicalizeSinglePrestataire(trimmed);
}

export function suggestPrestataires(query: string, limit = 8): string[] {
  const q = normalizeKey(query);
  const pool = PROSPECTION_PRESTATAIRE_NOMENCLATURE.filter(isValidPrestataire);
  if (!q) return pool.slice(0, limit);
  return pool.filter((item) => normalizeKey(item).includes(q)).slice(0, limit);
}

export { PROSPECTION_PRESTATAIRE_NOMENCLATURE };
