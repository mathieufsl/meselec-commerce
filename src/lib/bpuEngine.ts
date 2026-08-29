import type { BpuLigne } from "./commerceTypes";

export function roundEuro(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatEuro(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return (
    n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }) +
    " €"
  );
}

export function isBpuLigneSelectable(ligne: Pick<BpuLigne, "pu_ht" | "niveau">): boolean {
  return (
    ligne.pu_ht != null &&
    ligne.pu_ht > 0 &&
    (ligne.niveau === "ligne" || ligne.niveau === "sous_section")
  );
}

export function calcLigneMontant(quantite: number, puHt: number): number {
  return roundEuro(quantite * puHt);
}

export function sumReponseLignes(
  lignes: Array<{ quantite: number; pu_ht: number; montant?: number }>,
): number {
  return roundEuro(
    lignes.reduce((s, l) => s + (l.montant ?? calcLigneMontant(l.quantite, l.pu_ht)), 0),
  );
}

export type BpuImportRow = {
  poste_code?: string;
  numero_prix: string;
  designation: string;
  unite?: string;
  pu_ht?: number | null;
  niveau?: BpuLigne["niveau"];
  parent_numero?: string;
  ordre?: number;
};

/** Parse CSV/TSV simple (séparateur ; ou tab) pour import BPU. */
export function parseBpuTextImport(text: string): BpuImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const sep = lines[0]!.includes("\t") ? "\t" : ";";
  const rows: BpuImportRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i]!.split(sep).map((c) => c.trim());
    if (i === 0 && /numero|n°|designation/i.test(cols.join(" "))) continue;
    if (cols.length < 2) continue;

    const puRaw = cols[4]?.replace(",", ".") ?? cols[3]?.replace(",", ".");
    const pu = puRaw ? Number.parseFloat(puRaw) : null;

    rows.push({
      numero_prix: cols[0] ?? "",
      designation: cols[1] ?? "",
      unite: cols[2] || undefined,
      pu_ht: pu != null && !Number.isNaN(pu) ? pu : null,
      niveau: "ligne",
      ordre: i,
    });
  }

  return rows.filter((r) => r.numero_prix && r.designation);
}

export function daysUntil(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const target = new Date(dateIso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}
