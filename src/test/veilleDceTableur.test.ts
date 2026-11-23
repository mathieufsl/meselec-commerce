import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { afterAll, describe, expect, it } from "vitest";
import { classerPiece, selectionnerPieces, texteDePiece } from "../../scripts/dce/fichiers";
import { guessDcePieceType } from "@/lib/aoDocuments";

const dossier = mkdtempSync(join(tmpdir(), "dce-tableur-"));
afterAll(() => rmSync(dossier, { recursive: true, force: true }));

describe("cadre de prix (DPGF)", () => {
  it("classe les noms usuels de cadre de prix", () => {
    expect(classerPiece("DPGF lot 1.xlsx")).toBe("dpgf");
    expect(classerPiece("Annexe 2 - Décomposition du prix global.xlsx")).toBe("dpgf");
    expect(classerPiece("BPU.xls")).toBe("bpu");
  });

  it("retient un seul cadre de prix, le tableur plutôt que le PDF", () => {
    const pieces = selectionnerPieces([
      "/d/RC.pdf",
      "/d/CCTP.pdf",
      "/d/DPGF.pdf",
      "/d/DPGF.xlsx",
      "/d/BPU.xlsx",
    ]);
    expect(pieces.map((p) => p.chemin)).toEqual(["/d/RC.pdf", "/d/CCTP.pdf", "/d/DPGF.xlsx"]);
  });

  it("lit un tableur déposé sans nom parlant comme cadre de prix", () => {
    const pieces = selectionnerPieces(["/d/RC.pdf", "/d/Annexe 3.xlsx"]);
    expect(pieces.at(-1)).toEqual({ chemin: "/d/Annexe 3.xlsx", type: "dpgf" });
  });

  it("extrait le texte de chaque feuille", () => {
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      classeur,
      XLSX.utils.aoa_to_sheet([
        ["N°", "Désignation", "Unité", "Quantité"],
        [],
        ["1.1", "Mât acier 8 m", "u", 42],
      ]),
      "Lot 1",
    );
    const chemin = join(dossier, "DPGF.xlsx");
    writeFileSync(chemin, XLSX.write(classeur, { type: "buffer", bookType: "xlsx" }));
    const texte = texteDePiece(chemin);
    expect(texte).toContain("## Feuille « Lot 1 »");
    expect(texte).toContain("1.1 | Mât acier 8 m | u | 42");
    expect(texte.split("\n")).toHaveLength(3);
  });

  it("range les tableurs déposés avec la DPGF dans les documents de l'AO", () => {
    expect(guessDcePieceType("Cadre BPU.pdf")).toBe("dpgf");
    expect(guessDcePieceType("Annexe 3.xlsx")).toBe("dpgf");
    expect(guessDcePieceType("Plans.zip")).toBe("dce");
  });
});
