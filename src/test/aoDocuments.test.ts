import { describe, expect, it } from "vitest";
import { buildAoDocumentStoragePath, formatFileSize } from "@/lib/aoDocuments";

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
});
