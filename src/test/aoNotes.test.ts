import { describe, expect, it } from "vitest";
import { extractAoAnnonceUrl } from "@/lib/aoNotes";

describe("extractAoAnnonceUrl", () => {
  it("extrait l'URL Annonce : depuis un import veille", () => {
    const notes = [
      "Annonce : https://www.boamp.fr/avis/detail/26-87641",
      "Domaines : VRD / voirie",
    ].join("\n");
    expect(extractAoAnnonceUrl(notes)).toBe("https://www.boamp.fr/avis/detail/26-87641");
  });

  it("ignore la ponctuation de fin", () => {
    expect(extractAoAnnonceUrl("Annonce : https://example.com/a.")).toBe("https://example.com/a");
  });

  it("retourne null sans URL", () => {
    expect(extractAoAnnonceUrl("CPV : 45233140")).toBeNull();
    expect(extractAoAnnonceUrl(null)).toBeNull();
  });
});
