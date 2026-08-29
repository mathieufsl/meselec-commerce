import * as XLSX from "xlsx";
import type { BpuImportRow } from "./bpuEngine";

export type BpuExcelFormat =
  | "bpu_standard"
  | "meselec_v4"
  | "chiffrage_devis"
  | "dqe"
  | "unknown";

export type BpuExcelParseMode = "catalogue" | "reponse";

export type BpuExcelReponseRow = BpuImportRow & {
  quantite?: number;
};

export type BpuExcelParseResult = {
  format: BpuExcelFormat;
  mode: BpuExcelParseMode;
  sheetName: string;
  rows: BpuExcelReponseRow[];
  catalogueRows: BpuImportRow[];
  reponseRows: BpuExcelReponseRow[];
  meta: {
    fileName?: string;
    titre?: string;
    client?: string;
  };
};

function norm(s: unknown): string {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normKey(s: unknown): string {
  return norm(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseNum(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw).replace(/\s/g, "").replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function inferNiveau(numero: string, unite: string | undefined, pu: number | null): BpuImportRow["niveau"] {
  if (pu != null && pu > 0 && unite) return "ligne";
  if (/^(chap|rubrique|serie|poste)\b/i.test(numero)) return "section";
  if (/^\d+(\.\d+)+$/.test(numero) && !unite && pu == null) return "sous_section";
  if (pu != null && pu > 0) return "ligne";
  return "sous_section";
}

type Matrix = unknown[][];

function findHeaderRow(rows: Matrix, matcher: (cells: string[]) => boolean): number {
  for (let i = 0; i < Math.min(rows.length, 80); i++) {
    const cells = (rows[i] ?? []).map(normKey);
    if (matcher(cells)) return i;
  }
  return -1;
}

function colIndex(headers: string[], ...needles: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i] ?? "";
    if (needles.every((n) => h.includes(n))) return i;
  }
  for (const needle of needles) {
    const idx = headers.findIndex((h) => h.includes(needle));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseBpuStandard(rows: Matrix, startRow: number, headers: string[]): BpuImportRow[] {
  const iNum = colIndex(headers, "n°") >= 0 ? colIndex(headers, "n°") : colIndex(headers, "n", "article");
  const iDes = colIndex(headers, "designation");
  const iUnite = colIndex(headers, "unite");
  const iPu =
    colIndex(headers, "prix", "unitaire") >= 0
      ? colIndex(headers, "prix", "unitaire")
      : colIndex(headers, "p.u") >= 0
        ? colIndex(headers, "p.u")
        : colIndex(headers, "pu");

  const out: BpuImportRow[] = [];
  for (let r = startRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const numero = norm(row[iNum >= 0 ? iNum : 0]);
    const designation = norm(row[iDes >= 0 ? iDes : 1]);
    if (!numero && !designation) continue;
    if (!designation) continue;
    const unite = norm(row[iUnite >= 0 ? iUnite : 2]) || undefined;
    const pu = parseNum(row[iPu >= 0 ? iPu : 3]);
    const niveau = inferNiveau(numero, unite, pu);
    if (niveau === "ligne" || (pu != null && pu > 0)) {
      out.push({
        numero_prix: numero || `L${out.length + 1}`,
        designation,
        unite,
        pu_ht: pu,
        niveau: "ligne",
        ordre: out.length,
      });
    } else if (numero || designation) {
      out.push({
        numero_prix: numero || designation.slice(0, 20),
        designation,
        unite,
        pu_ht: null,
        niveau,
        ordre: out.length,
      });
    }
  }
  return out;
}

function parseMeselecV4(rows: Matrix): BpuImportRow[] {
  const out: BpuImportRow[] = [];
  let currentSerie = "";

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const c0 = norm(row[0]);
    const c1 = norm(row[1]);
    const c2 = norm(row[2]);
    const c3 = norm(row[3]);
    const c4 = row[4];

    const headerCells = row.map(normKey);
    if (headerCells.includes("n°") && headerCells.includes("unite") && headerCells.some((h) => h.includes("prix"))) {
      continue;
    }

    if (/^serie\s+[a-z]/i.test(c0) || /^serie\s+[a-z]/i.test(c1)) {
      currentSerie = c0 || c1;
      out.push({
        numero_prix: currentSerie,
        designation: currentSerie,
        niveau: "section",
        ordre: out.length,
      });
      continue;
    }

    if (c1 && /^[A-Z]$/.test(c1)) currentSerie = `Série ${c1}`;

    const numero = c0 || c1;
    const designation = c2 || c0;
    const unite = c3 || undefined;
    const pu = parseNum(c4);

    if (!designation || designation.length < 4) continue;
    if (/^(n°|designation|tranchee|demolition)$/i.test(designation)) continue;

    if (pu != null && pu > 0 && unite) {
      const num = numero && /^\d+$/.test(numero) ? `${currentSerie ? currentSerie + "-" : ""}${numero}` : numero || `L${out.length + 1}`;
      out.push({
        poste_code: c1 && /^[A-Z]$/.test(c1) ? c1 : undefined,
        numero_prix: num,
        designation,
        unite,
        pu_ht: pu,
        niveau: "ligne",
        ordre: out.length,
      });
    }
  }
  return out;
}

function parseChiffrageDevis(rows: Matrix, startRow: number, headers: string[]): BpuExcelReponseRow[] {
  const iNum = colIndex(headers, "n°") >= 0 ? colIndex(headers, "n°") : 0;
  const iDes = colIndex(headers, "designation");
  const iUnite = colIndex(headers, "u");
  const iQte = colIndex(headers, "qt");
  const iPu = colIndex(headers, "p", "unitaire");

  const out: BpuExcelReponseRow[] = [];
  for (let r = startRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const numero = norm(row[iNum]);
    const designation = norm(row[iDes >= 0 ? iDes : 1]);
    if (!numero || !designation) continue;
    if (!/^\d/.test(numero) && !numero.includes(".")) continue;
    const unite = norm(row[iUnite >= 0 ? iUnite : 2]) || undefined;
    const quantite = parseNum(row[iQte >= 0 ? iQte : 3]) ?? 0;
    const pu = parseNum(row[iPu >= 0 ? iPu : 4]);
    if (pu == null || pu <= 0) continue;
    out.push({
      numero_prix: numero,
      designation,
      unite,
      pu_ht: pu,
      quantite: quantite > 0 ? quantite : 1,
      niveau: "ligne",
      ordre: out.length,
    });
  }
  return out;
}

function parseDqe(rows: Matrix, startRow: number, headers: string[]): BpuExcelReponseRow[] {
  const iDes = colIndex(headers, "designation");
  const iQte = colIndex(headers, "quantite");
  const iPu = colIndex(headers, "taux");
  const iTotal = colIndex(headers, "total");

  const out: BpuExcelReponseRow[] = [];
  for (let r = startRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const designation = norm(row[iDes >= 0 ? iDes : 0]);
    if (!designation || designation.length < 8) continue;
    const quantite = parseNum(row[iQte >= 0 ? iQte : 1]) ?? 1;
    const pu = parseNum(row[iPu >= 0 ? iPu : 2]);
    const total = parseNum(row[iTotal >= 0 ? iTotal : 3]);
    if (pu == null && total == null) continue;
    const puHt = pu ?? (total != null && quantite > 0 ? total / quantite : null);
    if (puHt == null) continue;
    out.push({
      numero_prix: `DQE-${out.length + 1}`,
      designation,
      unite: "h",
      pu_ht: puHt,
      quantite,
      niveau: "ligne",
      ordre: out.length,
    });
  }
  return out;
}

function detectMeta(rows: Matrix): { titre?: string; client?: string } {
  const meta: { titre?: string; client?: string } = {};
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const line = (rows[i] ?? []).map(norm).filter(Boolean).join(" ");
    if (!line) continue;
    if (/mairie|ville de|centre des monuments/i.test(line)) meta.client = line.slice(0, 120);
    if (/bordereau|accord-cadre|eclairage|exploitation/i.test(line) && !meta.titre) {
      meta.titre = line.slice(0, 160);
    }
  }
  return meta;
}

function tryParseSheet(
  rows: Matrix,
  sheetName: string,
  fileName?: string,
): BpuExcelParseResult | null {
  const meta = { ...detectMeta(rows), fileName };

  const stdHeader = findHeaderRow(rows, (cells) => {
    const joined = cells.join("|");
    return (
      (joined.includes("n°") || joined.includes("n article")) &&
      joined.includes("designation") &&
      (joined.includes("unite") || joined.includes("unité")) &&
      (joined.includes("prix") || joined.includes("p.u"))
    );
  });

  if (stdHeader >= 0) {
    const headers = (rows[stdHeader] ?? []).map(normKey);
    const catalogueRows = parseBpuStandard(rows, stdHeader, headers).filter(
      (r) => r.niveau === "ligne" && r.pu_ht != null && r.pu_ht > 0,
    );
    if (catalogueRows.length > 0) {
      return {
        format: "bpu_standard",
        mode: "catalogue",
        sheetName,
        rows: catalogueRows,
        catalogueRows,
        reponseRows: catalogueRows,
        meta,
      };
    }
  }

  const chiffrageHeader = findHeaderRow(rows, (cells) => {
    const joined = cells.join("|");
    return joined.includes("n°") && joined.includes("designation") && joined.includes("qt");
  });

  if (chiffrageHeader >= 0) {
    const headers = (rows[chiffrageHeader] ?? []).map(normKey);
    const reponseRows = parseChiffrageDevis(rows, chiffrageHeader, headers);
    if (reponseRows.length > 0) {
      return {
        format: "chiffrage_devis",
        mode: "reponse",
        sheetName,
        rows: reponseRows,
        catalogueRows: reponseRows.map(({ quantite: _q, ...r }) => r),
        reponseRows,
        meta,
      };
    }
  }

  const dqeHeader = findHeaderRow(rows, (cells) => {
    const joined = cells.join("|");
    return joined.includes("designation") && joined.includes("quantite") && joined.includes("taux");
  });

  if (dqeHeader >= 0) {
    const headers = (rows[dqeHeader] ?? []).map(normKey);
    const reponseRows = parseDqe(rows, dqeHeader, headers);
    if (reponseRows.length > 0) {
      return {
        format: "dqe",
        mode: "reponse",
        sheetName,
        rows: reponseRows,
        catalogueRows: reponseRows.map(({ quantite: _q, ...r }) => r),
        reponseRows,
        meta,
      };
    }
  }

  if (/feuil|meselec/i.test(sheetName) || fileName?.toLowerCase().includes("bpu v4")) {
    const catalogueRows = parseMeselecV4(rows);
    if (catalogueRows.length > 0) {
      return {
        format: "meselec_v4",
        mode: "catalogue",
        sheetName,
        rows: catalogueRows,
        catalogueRows,
        reponseRows: catalogueRows,
        meta,
      };
    }
  }

  const meselec = parseMeselecV4(rows);
  if (meselec.length > 10) {
    return {
      format: "meselec_v4",
      mode: "catalogue",
      sheetName,
      rows: meselec,
      catalogueRows: meselec,
      reponseRows: meselec,
      meta,
    };
  }

  return null;
}

export function parseBpuExcelBuffer(
  buffer: ArrayBuffer,
  fileName?: string,
): BpuExcelParseResult {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  let best: BpuExcelParseResult | null = null;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]!;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as Matrix;
    const candidate = tryParseSheet(rows, sheetName, fileName);
    if (!candidate) continue;
    if (!best || candidate.rows.length > best.rows.length) {
      best = candidate;
    }
  }

  if (best) return best;

  const fallbackName = wb.SheetNames[0] ?? "Sheet1";
  const fallbackRows = XLSX.utils.sheet_to_json(wb.Sheets[fallbackName]!, {
    header: 1,
    defval: "",
  }) as Matrix;

  return {
    format: "unknown",
    mode: "catalogue",
    sheetName: fallbackName,
    rows: [],
    catalogueRows: [],
    reponseRows: [],
    meta: { ...detectMeta(fallbackRows), fileName },
  };
}

export async function parseBpuExcelFile(file: File): Promise<BpuExcelParseResult> {
  const buffer = await file.arrayBuffer();
  return parseBpuExcelBuffer(buffer, file.name);
}

export function catalogueRowsOnly(rows: BpuImportRow[]): BpuImportRow[] {
  return rows.filter((r) => r.pu_ht != null && r.pu_ht > 0 && r.designation);
}
