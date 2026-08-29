/**
 * Génère la migration SQL des catalogues EP à partir des fichiers Excel.
 * Usage: npx vite-node scripts/generate-ep-seed.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogueRowsOnly, parseBpuExcelBuffer } from "../src/lib/bpuExcelImport";
import type { BpuImportRow } from "../src/lib/bpuEngine";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CATALOGUES = [
  {
    id: "c0000001-0000-4000-8000-000000000001",
    file: "/Users/mathieufaessel/Downloads/3_MESELEC_2026.01 BPU Eclairage, illuminations et enfouissement.xlsx",
    nom: "EP Osny 2026.01 — Éclairage & enfouissement",
    type: "bpu" as const,
  },
  {
    id: "c0000001-0000-4000-8000-000000000002",
    file: "/Users/mathieufaessel/Downloads/MESELEC_BPU v4_precision du 29042026.xlsx",
    nom: "EP Meselec BPU v4 — Réseaux & génie civil",
    type: "bpu" as const,
  },
  {
    id: "c0000001-0000-4000-8000-000000000003",
    file: "/Users/mathieufaessel/Downloads/Chiffrage_05_05.xlsx",
    nom: "EP Chiffrage terrassement (référence prix)",
    type: "dpgf" as const,
  },
  {
    id: "c0000001-0000-4000-8000-000000000004",
    file: "/Users/mathieufaessel/Downloads/20260611_GOU_BPU_Lot2_Ind002_MESELEC.xlsx",
    nom: "EP Goussainville — Lot 2 maintenance",
    type: "bpu" as const,
  },
  {
    id: "c0000001-0000-4000-8000-000000000005",
    file: "/Users/mathieufaessel/Downloads/26-641-100 - BPU-DQE_MESELEC.xlsx",
    nom: "EP CMN Arc de Triomphe — DQE horaire",
    type: "dpgf" as const,
  },
];

function sqlStr(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "null";
  return String(n);
}

function ligneValues(catalogueId: string, rows: BpuImportRow[]): string[] {
  return rows.map((r, i) => {
    const ordre = r.ordre ?? i;
    return `(
  ${sqlStr(catalogueId)}::uuid,
  ${r.poste_code ? sqlStr(r.poste_code) : "null"},
  ${sqlStr(r.numero_prix)},
  ${sqlStr(r.designation)},
  ${r.unite ? sqlStr(r.unite) : "null"},
  ${sqlNum(r.pu_ht)},
  ${sqlStr(r.niveau ?? "ligne")},
  ${r.parent_numero ? sqlStr(r.parent_numero) : "null"},
  ${ordre}
)`;
  });
}

const outPath = path.join(__dirname, "../supabase/migrations/20260829150000_seed_ep_catalogues.sql");
const parts: string[] = [
  "-- Seed catalogues BPU/DPGF Éclairage Public (généré depuis les fichiers Excel Meselec)",
  "",
  "insert into public.bpu_catalogues (id, nom, type, secteur, source_fichier, actif, notes)",
  "values",
];

const catalogueValues: string[] = [];
const allLigneInserts: string[] = [];
const summary: Array<{ nom: string; lignes: number; file: string }> = [];

for (const cat of CATALOGUES) {
  if (!fs.existsSync(cat.file)) {
    console.warn("SKIP missing:", cat.file);
    continue;
  }
  const buf = fs.readFileSync(cat.file);
  const parsed = parseBpuExcelBuffer(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    path.basename(cat.file),
  );
  const rows = catalogueRowsOnly(parsed.catalogueRows).filter(
    (r) => r.pu_ht != null && r.pu_ht > 0,
  );

  summary.push({ nom: cat.nom, lignes: rows.length, file: path.basename(cat.file) });

  catalogueValues.push(
    `  (${sqlStr(cat.id)}::uuid, ${sqlStr(cat.nom)}, ${sqlStr(cat.type)}, 'EP', ${sqlStr(path.basename(cat.file))}, true, ${sqlStr(`Import auto — ${parsed.format} / ${parsed.sheetName}`)})`,
  );

  if (rows.length > 0) {
    const batchSize = 80;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      allLigneInserts.push(
        `insert into public.bpu_lignes (catalogue_id, poste_code, numero_prix, designation, unite, pu_ht, niveau, parent_numero, ordre)\nvalues\n${ligneValues(cat.id, batch).join(",\n")}\non conflict (catalogue_id, numero_prix, designation) do update set\n  poste_code = excluded.poste_code,\n  unite = excluded.unite,\n  pu_ht = excluded.pu_ht,\n  niveau = excluded.niveau,\n  parent_numero = excluded.parent_numero,\n  ordre = excluded.ordre;`,
      );
    }
  }
}

parts.push(catalogueValues.join(",\n"));
parts.push("on conflict (id) do update set");
parts.push("  nom = excluded.nom,");
parts.push("  type = excluded.type,");
parts.push("  secteur = excluded.secteur,");
parts.push("  source_fichier = excluded.source_fichier,");
parts.push("  notes = excluded.notes;");
parts.push("");
parts.push(...allLigneInserts);

fs.writeFileSync(outPath, parts.join("\n"));
console.log("Written:", outPath);
console.table(summary);
