import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  classerPiece,
  deplierDce,
  selectionnerPieces,
  texteDePiece,
} from "../../scripts/dce/fichiers";

describe("classerPiece", () => {
  it.each([
    ["DCE/01_RC_Eclairage.pdf", "rc"],
    ["Règlement de la consultation.docx", "rc"],
    ["02-CCTP lot 1.pdf", "cctp"],
    ["Cahier des clauses techniques particulières.pdf", "cctp"],
    ["CCAP.pdf", "ccap"],
    ["Attestation de visite.pdf", "visite"],
    ["DPGF.xlsx", "dpgf"],
    ["BPU_DQE.xls", "bpu"],
    ["AE.pdf", "ae"],
    ["02 - CCTP/annexe 3.pdf", "cctp"],
    ["photo.jpg", "autre"],
  ])("%s → %s", (nom, type) => {
    expect(classerPiece(nom)).toBe(type);
  });
});

describe("selectionnerPieces", () => {
  it("garde RC, CCTP et visite, PDF prioritaire sur Word", () => {
    const sel = selectionnerPieces([
      "/d/CCTP.docx",
      "/d/CCTP.pdf",
      "/d/RC.pdf",
      "/d/CCAP.pdf",
      "/d/DPGF.xlsx",
      "/d/Attestation_visite.pdf",
    ]);
    expect(sel.map((p) => basename(p.chemin))).toEqual([
      "RC.pdf",
      "Attestation_visite.pdf",
      "CCTP.pdf",
    ]);
  });

  it("prend le CCAP quand le RC manque", () => {
    const sel = selectionnerPieces(["/d/CCAP.pdf", "/d/CCTP.pdf"]);
    expect(sel.map((p) => p.type)).toEqual(["ccap", "cctp"]);
  });
});

const outilsDispo = (() => {
  try {
    execFileSync("unzip", ["-v"], { stdio: "pipe" });
    execFileSync("python3", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!outilsDispo)("deplierDce", () => {
  const dossier = mkdtempSync(join(tmpdir(), "dce-test-"));
  afterAll(() => rmSync(dossier, { recursive: true, force: true }));

  it("extrait les zips imbriqués et lit un docx", () => {
    const script = `
import zipfile, io, sys
d = sys.argv[1]
docx = io.BytesIO()
with zipfile.ZipFile(docx, "w") as z:
    z.writestr("word/document.xml", "<w:document><w:body><w:p><w:r><w:t>Visite obligatoire le 12/10</w:t></w:r></w:p></w:body></w:document>")
inner = io.BytesIO()
with zipfile.ZipFile(inner, "w") as z:
    z.writestr("Pieces/CCTP.docx", docx.getvalue())
with zipfile.ZipFile(d + "/DCE.zip", "w") as z:
    z.writestr("RC.txt", "Reglement de consultation")
    z.writestr("Techniques.zip", inner.getvalue())
`;
    execFileSync("python3", ["-I", "-c", script, dossier]);
    const fichiers = deplierDce(dossier);
    const noms = fichiers.map((f) => basename(f)).sort();
    expect(noms).toEqual(["CCTP.docx", "RC.txt"]);
    const cctp = fichiers.find((f) => f.endsWith("CCTP.docx"));
    expect(texteDePiece(cctp as string)).toContain("Visite obligatoire le 12/10");
  });
});
