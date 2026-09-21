/**
 * Génère nomenclature prestataires + seed de référence depuis le CSV export.
 * Usage: npx vite-node scripts/import-prospection-csv.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "data/MESELEC_Prospection_EP_IDF.csv");
const NOMENCLATURE_OUT = path.join(__dirname, "../src/data/prospectionPrestataireNomenclature.ts");
const SEED_OUT = path.join(__dirname, "../src/data/prospectionReferenceSeed.ts");

const STATUS_MAP: Record<string, string> = {
  todo: "todo",
  "à traiter": "todo",
  inprogress: "inprogress",
  "en cours": "inprogress",
  done: "done",
  obtenu: "done",
  callback: "callback",
  rappeler: "callback",
  refused: "refused",
  refus: "refused",
};

const GESTION_MAP: Record<string, string> = {
  commune: "commune",
  agglo: "agglo",
  syndicat: "syndicat",
};

const NOISE_PRESTATAIRE = new Set(
  [
    "mail envoyé",
    "envoyé un mail",
    "envoyé u mail",
    "laissé un mail",
    "message vocal",
    "mess v",
    "non communiqué",
    "non renseigné",
    "non, un renouvellement est en cours",
    "non",
    "ne sait pas",
    "ne sais pas",
    "confidentiel",
    "departement",
    "insee",
    "il en a pas",
    "?",
    "-",
  ].map((s) => s.toLowerCase()),
);

function isNoisePrestataire(value: string): boolean {
  const lower = normalizeKey(value);
  if (!lower || NOISE_PRESTATAIRE.has(lower)) return true;
  if (/^mail/.test(lower) || /^envoy/.test(lower)) return true;
  if (/^\d[\d\s]{5,}$/.test(lower)) return true;
  return false;
}

/** Canonique → variantes connues (minuscules sans accents). */
const CANONICAL_ALIASES: Record<string, string[]> = {
  Citeos: ["citeos", "citéos", "spir city network", "cu gpseo"],
  EES: [
    "ees",
    "eiffage",
    "eiffage energie",
    "eiffage énergie",
    "eiffage energies",
    "eiffage energie + satelec",
    "eiffage energie + satelec",
  ],
  Satelec: ["satelec"],
  Bouygues: [
    "bouygues",
    "bouygues energie",
    "bouygues energies et services",
    "bouygues energies et services / citeos",
  ],
  Spie: ["spie", "spie citynetworks", "spie city networks"],
  Entra: ["entra"],
  Bir: ["bir"],
  GPSEO: ["gpseo"],
  SDESM: ["sdesm"],
  Enedis: ["enedis"],
  Pruneveille: ["pruneveille"],
  Inéo: ["ineo", "inéo"],
  EDF: ["edf"],
  Viola: ["viola"],
  Bentin: ["bentin"],
  Stelens: ["stelens"],
  "M Light": ["m light", "mlight"],
  Queckenborn: ["queckenborn"],
  Seip: ["seip"],
  Ses: ["ses"],
  "PF Lighting": ["pf lighting"],
  Raoult: ["raoult"],
  Terideal: ["terideal"],
  Sicae: ["sicae"],
  Stpee: ["stpee"],
  Help: ["help"],
};

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ";" && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function communeKey(departement: string, ville: string): string {
  return `${departement}::${ville}`;
}

function canonicalizePrestataire(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || isNoisePrestataire(trimmed)) return null;
  const lower = normalizeKey(trimmed);

  for (const [canonical, aliases] of Object.entries(CANONICAL_ALIASES)) {
    if (normalizeKey(canonical) === lower) return canonical;
    if (aliases.some((a) => lower === normalizeKey(a) || lower.includes(normalizeKey(a)))) {
      return canonical;
    }
  }

  if (/^eiffage/i.test(trimmed)) return "EES";
  if (/^bouygues/i.test(trimmed)) return "Bouygues";
  if (/citeos/i.test(trimmed)) return "Citeos";
  if (/satelec/i.test(trimmed)) return "Satelec";
  if (/^spie/i.test(trimmed)) return "Spie";

  return trimmed.replace(/\s+/g, " ");
}

function splitPrestataires(raw: string): string[] {
  return raw
    .split(/[,/+]| et /i)
    .map((p) => canonicalizePrestataire(p))
    .filter((p): p is string => Boolean(p));
}

function main() {
  const content = fs.readFileSync(CSV_PATH, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(headers.map((h, i) => [h.trim(), i]));

  const seed: Record<
    string,
    {
      gestion?: "" | "commune" | "agglo" | "syndicat";
      status?: string;
      prestataire?: string;
      contact?: string;
      notes?: string;
    }
  > = {};

  const canonicalSet = new Set<string>(Object.keys(CANONICAL_ALIASES));
  const seenRaw = new Set<string>();

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const dep = cells[idx["Departement"]]?.trim();
    const ville = cells[idx["Commune"]]?.trim();
    if (!dep || !ville) continue;

    const key = communeKey(dep, ville);
    const gestionRaw = normalizeKey(cells[idx["Qui gere EP"]] ?? "");
    const statusRaw = normalizeKey(cells[idx["Statut"]] ?? "");
    const prestataireRaw = cells[idx["Prestataire EP"]]?.trim() ?? "";
    const contact = cells[idx["Contact"]]?.trim() ?? "";
    const notes = cells[idx["Notes"]]?.trim() ?? "";

    const entry: (typeof seed)[string] = {};
    const gestion = GESTION_MAP[gestionRaw];
    if (gestion) entry.gestion = gestion as "" | "commune" | "agglo" | "syndicat";

    const status = STATUS_MAP[statusRaw];
    if (status) entry.status = status;

    const parts = splitPrestataires(prestataireRaw);
    if (parts.length === 1) {
      entry.prestataire = parts[0];
      seenRaw.add(parts[0]);
    } else if (parts.length > 1) {
      entry.prestataire = parts.join(" + ");
      parts.forEach((p) => seenRaw.add(p));
    }

    if (contact) entry.contact = contact;
    if (notes) entry.notes = notes;

    if (Object.keys(entry).length > 0) seed[key] = entry;
  }

  const nomenclature = [...new Set([...Object.keys(CANONICAL_ALIASES), ...seenRaw])]
    .filter((n) => !isNoisePrestataire(n))
    .sort((a, b) => a.localeCompare(b, "fr"));

  const nomContent = `/** Auto-generated by scripts/import-prospection-csv.ts */
export const PROSPECTION_PRESTATAIRE_NOMENCLATURE: string[] = ${JSON.stringify(nomenclature, null, 2)};

export const PROSPECTION_PRESTATAIRE_ALIASES: Record<string, string[]> = ${JSON.stringify(CANONICAL_ALIASES, null, 2)};
`;

  const seedContent = `/** Auto-generated by scripts/import-prospection-csv.ts — données de référence CSV */
import type { ProspectionCommuneState } from "@/lib/prospection/api";

export type ProspectionReferenceSeed = Partial<
  Pick<ProspectionCommuneState, "gestion" | "status" | "prestataire" | "contact" | "notes">
>;

export const PROSPECTION_REFERENCE_SEED: Record<string, ProspectionReferenceSeed> = ${JSON.stringify(seed, null, 2)};
`;

  fs.writeFileSync(NOMENCLATURE_OUT, nomContent, "utf8");
  fs.writeFileSync(SEED_OUT, seedContent, "utf8");
  console.log(`Nomenclature: ${nomenclature.length} prestataires → ${NOMENCLATURE_OUT}`);
  console.log(`Seed: ${Object.keys(seed).length} communes → ${SEED_OUT}`);
}

main();
