import { describe, expect, it } from "vitest";
import { dossierDuJour, nomDossierAo, villeDepuisAcheteur } from "./aoSharepoint";

describe("aoSharepoint", () => {
  it("retire « Commune de », « Ville de »… du donneur d'ordre", () => {
    expect(villeDepuisAcheteur("Commune de Noisy-le-Grand")).toBe("Noisy-le-Grand");
    expect(villeDepuisAcheteur("Ville de Puteaux")).toBe("Puteaux");
    expect(villeDepuisAcheteur("Département du Val-de-Marne")).toBe("Val-de-Marne");
    expect(villeDepuisAcheteur("Paris Musées")).toBe("Paris Musées");
  });

  it("nomme le dossier VILLE_SECTEURS dans l'ordre habituel", () => {
    expect(
      nomDossierAo({
        donneur_ordre_libre: "Commune de Bezons",
        secteurs: ["VRD", "Illumination", "EP", "CFO_CFA"],
      }),
    ).toBe("Bezons_EP_VRD_CFO_CFA_Illumination");
    expect(nomDossierAo({ donneur_ordre_libre: "Clichy", secteurs: [] })).toBe("Clichy");
  });

  it("enlève les caractères interdits et retombe sur la référence", () => {
    expect(nomDossierAo({ donneur_ordre_libre: "A/B: C?", secteurs: ["EP"] })).toBe("A B C_EP");
    expect(nomDossierAo({ donneur_ordre_libre: "", reference: "BOAMP-26-1", secteurs: [] })).toBe(
      "BOAMP-26-1",
    );
  });

  it("date du dossier au format jj_mm_aaaa, heure de Paris", () => {
    expect(dossierDuJour(new Date("2026-11-23T23:30:00Z"))).toBe("24_11_2026");
  });
});
