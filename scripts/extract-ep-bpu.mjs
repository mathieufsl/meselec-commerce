#!/usr/bin/env node
/**
 * Extrait les lignes BPU/DPGF des fichiers Excel EP et écrit un résumé JSON.
 * Usage: node scripts/extract-ep-bpu.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

// Dynamic import won't work for TS - duplicate minimal parse via xlsx only for summary
// Run `npm test -- bpuExcelImport` for full parser validation.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../data/bpu-ep");

const files = [
  "/Users/mathieufaessel/Downloads/3_MESELEC_2026.01 BPU Eclairage, illuminations et enfouissement.xlsx",
  "/Users/mathieufaessel/Downloads/MESELEC_BPU v4_precision du 29042026.xlsx",
  "/Users/mathieufaessel/Downloads/Chiffrage_05_05.xlsx",
  "/Users/mathieufaessel/Downloads/20260611_GOU_BPU_Lot2_Ind002_MESELEC.xlsx",
  "/Users/mathieufaessel/Downloads/26-641-100 - BPU-DQE_MESELEC.xlsx",
];

fs.mkdirSync(outDir, { recursive: true });

const summary = [];

for (const fp of files) {
  if (!fs.existsSync(fp)) {
    summary.push({ file: path.basename(fp), status: "missing" });
    continue;
  }
  const buf = fs.readFileSync(fp);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheets = wb.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "" });
    return { name, rowCount: rows.length };
  });
  summary.push({
    file: path.basename(fp),
    status: "ok",
    sheets,
    suggestedCatalogue: path.basename(fp).replace(/\.xlsx$/i, ""),
  });
}

fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
