import { describe, expect, it } from "vitest";
import { memeTitre, numerosConsultation } from "@/lib/veilleDoublons.server";
import { dansZone } from "@/lib/veilleCollect.server";

describe("doublons de veille", () => {
  it("lit les numéros de consultation des liens de plateformes", () => {
    expect(
      numerosConsultation(
        "https://marches.maximilien.fr/entreprise/consultation/951109?orgAcronyme=d6a",
        "https://marches.maximilien.fr/?page=Entreprise.EntrepriseAdvancedSearch&AllCons&id=948737&orgAcronyme=d7o",
        "https://www.marches-publics.info/mpiaws/index.cfm?fuseaction=dematent.login&type=Dce&Idm=1904805",
        null,
      ),
    ).toEqual(["951109", "948737", "1904805"]);
  });

  it("reconnaît le même intitulé malgré la casse, les accents et un suffixe", () => {
    expect(
      memeTitre(
        "Travaux d'éclairage public de la rue de Bretagne",
        "TRAVAUX D'ECLAIRAGE PUBLIC DE LA RUE DE BRETAGNE - 2 lots",
      ),
    ).toBe(true);
    expect(memeTitre("Travaux de voirie", "Travaux d'assainissement")).toBe(false);
    // Même AO, intitulés rédigés différemment (BOAMP / PLACE).
    expect(
      memeTitre(
        "EXTENSION DE L'ADMINISTRATION DE LA MAISON D'ARRET D'OSNY-PONTOISE SPIP 95",
        "La présente consultation a pour objet des travaux d'extension de l'administration du centre pénitentiaire d'Osny-Pontoise (Construction d'un étage R+2 pour la création des locaux du SPIP 95).",
      ),
    ).toBe(true);
    // Deux marchés différents aux intitulés génériques proches.
    expect(
      memeTitre(
        "Accord-cadre de travaux d'entretien de voirie de la commune de Morangis",
        "Accord-cadre de travaux d'entretien des bâtiments de la commune de Chatou",
      ),
    ).toBe(false);
  });

  it("filtre la zone sur des codes département exacts", () => {
    expect(dansZone("78 95 92", ["92"])).toBe(true);
    expect(dansZone("27", ["2"])).toBe(false);
    expect(dansZone("2", ["02"])).toBe(true);
    expect(dansZone(null, null)).toBe(true);
  });
});

describe("lecture AWS", async () => {
  const { dateCourte } = await import("@/lib/veilleAws");
  it("lit les dates courtes jj/mm/aa", () => {
    expect(dateCourte("26/11/26 à 12h00")).toBe("2026-11-26");
    expect(dateCourte("le 03/01/2027")).toBe("2027-01-03");
    expect(dateCourte(undefined)).toBeNull();
  });
});
