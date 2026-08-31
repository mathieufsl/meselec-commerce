import { describe, expect, it } from "vitest";
import {
  buildAoDocumentStoragePath,
  blobWithMime,
  formatFileSize,
  getAoDocumentPreviewKind,
  guessAoDocumentTypeFromFileName,
  inferAoDocumentMime,
  isAoUploadAllowedType,
  triageIncomingAoFiles,
} from "@/lib/aoDocuments";
import type { AoDocument } from "@/lib/commerceTypes";

const baseDoc = (overrides: Partial<AoDocument> = {}): AoDocument => ({
  id: "doc-1",
  ao_id: "ao-1",
  type: "dce",
  nom_fichier: "test.pdf",
  fichier_url: null,
  storage_path: "ao-1/dce/test.pdf",
  taille_octets: 1000,
  mime_type: "application/pdf",
  version: 1,
  notes: null,
  uploaded_by: null,
  uploaded_by_email: null,
  created_at: "2026-08-30T00:00:00Z",
  ...overrides,
});

describe("aoDocuments", () => {
  it("formats file sizes", () => {
    expect(formatFileSize(500)).toBe("500 o");
    expect(formatFileSize(2048)).toBe("2.0 Ko");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 Mo");
  });

  it("builds storage paths per AO", () => {
    const path = buildAoDocumentStoragePath("ao-1", "dce", "Mon RC final.pdf");
    expect(path.startsWith("ao-1/dce/")).toBe(true);
    expect(path.endsWith("Mon_RC_final.pdf")).toBe(true);
  });

  it("detects preview kinds", () => {
    expect(getAoDocumentPreviewKind(baseDoc())).toBe("pdf");
    expect(
      getAoDocumentPreviewKind(
        baseDoc({ mime_type: "application/octet-stream", nom_fichier: "kbis.pdf" }),
      ),
    ).toBe("pdf");
    expect(getAoDocumentPreviewKind(baseDoc({ mime_type: "image/png", nom_fichier: "plan.png" }))).toBe(
      "image",
    );
    expect(getAoDocumentPreviewKind(baseDoc({ mime_type: null, nom_fichier: "bpu.xlsx" }))).toBe("none");
    expect(getAoDocumentPreviewKind(baseDoc({ storage_path: null }))).toBe("none");
  });

  it("infers mime from extension when storage has octet-stream", () => {
    const doc = baseDoc({ mime_type: "application/octet-stream", nom_fichier: "attestation.pdf" });
    expect(inferAoDocumentMime(doc)).toBe("application/pdf");
    const raw = new Blob(["%PDF"], { type: "application/octet-stream" });
    expect(blobWithMime(raw, doc).type).toBe("application/pdf");
  });

  it("restricts upload types to memoire, cctp and dpgf", () => {
    expect(isAoUploadAllowedType("memoire")).toBe(true);
    expect(isAoUploadAllowedType("cctp")).toBe(true);
    expect(isAoUploadAllowedType("dpgf")).toBe(true);
    expect(isAoUploadAllowedType("dce")).toBe(false);
    expect(isAoUploadAllowedType("reponse")).toBe(false);
  });

  it("guesses document type from file name", () => {
    expect(guessAoDocumentTypeFromFileName("CCTP_Epinay.pdf")).toBe("cctp");
    expect(guessAoDocumentTypeFromFileName("lot1_DPGF.xlsx")).toBe("dpgf");
    expect(guessAoDocumentTypeFromFileName("Memoire_technique_v2.docx")).toBe("memoire");
    expect(guessAoDocumentTypeFromFileName("RC_consultation.pdf")).toBeNull();
  });

  it("triages dropped files and skips unrelated DCE pieces", () => {
    const { accepted, skipped } = triageIncomingAoFiles([
      new File(["a"], "CCTP.pdf"),
      new File(["b"], "reglement.pdf"),
      new File(["c"], "DPGF_lot.xlsx"),
    ]);
    expect(accepted.map((a) => a.type)).toEqual(["cctp", "dpgf"]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]?.name).toBe("reglement.pdf");
  });
});
