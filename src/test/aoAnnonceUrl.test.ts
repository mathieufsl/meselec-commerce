import { describe, expect, it } from "vitest";
import { aoAnnonceUrl } from "@/lib/aoAnnonceUrl";

describe("aoAnnonceUrl", () => {
  it("privilégie le champ lien de l'annonce", () => {
    expect(
      aoAnnonceUrl({
        reference: "BOAMP-26-1",
        notes: "Annonce : https://www.boamp.fr/avis/detail/26-1",
        annonce_url: " https://marches.fr/avis ",
      }),
    ).toBe("https://marches.fr/avis");
  });

  it("prend la ligne Annonce des notes", () => {
    expect(
      aoAnnonceUrl({
        reference: "X",
        notes: "Voir https://autre.fr\nAnnonce : https://www.boamp.fr/avis/detail/26-1\nCPV : 1",
      }),
    ).toBe("https://www.boamp.fr/avis/detail/26-1");
  });

  it("prend sinon la première URL des notes", () => {
    expect(aoAnnonceUrl({ reference: "RU2026", notes: "DCE sur https://marches.fr/x." })).toBe(
      "https://marches.fr/x",
    );
  });

  it("déduit l'avis BOAMP de la référence", () => {
    expect(aoAnnonceUrl({ reference: "BOAMP-26-84697", notes: null })).toBe(
      "https://www.boamp.fr/avis/detail/26-84697",
    );
  });

  it("renvoie null sans URL", () => {
    expect(aoAnnonceUrl({ reference: "RU2026", notes: "rien" })).toBeNull();
  });
});
