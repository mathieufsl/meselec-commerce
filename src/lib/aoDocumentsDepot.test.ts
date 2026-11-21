import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { filterAoDocumentsByAllowedTypes, guessDcePieceType } from "@/lib/aoDocuments";
import type { AoDocument } from "@/lib/commerceTypes";

describe("guessDcePieceType", () => {
  it("reconnaît les pièces du DCE d'après le nom", () => {
    expect(guessDcePieceType("AWS-MPI-1903957-RC.pdf")).toBe("rc");
    expect(guessDcePieceType("Règlement de consultation.pdf")).toBe("rc");
    expect(guessDcePieceType("02_CCTP lot 5.pdf")).toBe("cctp");
    expect(guessDcePieceType("DPGF.xlsx")).toBe("dpgf");
    expect(guessDcePieceType("AWS-MPI-1903957-PC.zip")).toBe("dce");
    expect(guessDcePieceType("source.pdf")).toBe("dce");
  });
});

describe("filterAoDocumentsByAllowedTypes", () => {
  it("affiche aussi les RC et DCE repris de la veille", () => {
    const docs = ["rc", "dce", "cctp", "autre"].map((type) => ({ type }) as AoDocument);
    expect(filterAoDocumentsByAllowedTypes(docs).map((d) => d.type)).toEqual(["rc", "dce", "cctp"]);
  });
});
