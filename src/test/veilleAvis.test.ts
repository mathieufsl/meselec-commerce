import { describe, expect, it } from "vitest";
import { indicesDepuisTexte, lireAvis, plateformeDepuisUrl } from "@/lib/veilleAvis";

describe("plateformeDepuisUrl", () => {
  it("reconnaît les plateformes gérées", () => {
    expect(
      plateformeDepuisUrl(
        "https://www.marches-publics.gouv.fr/?page=Entreprise.EntrepriseDetailsConsultation&refConsultation=123",
      ),
    ).toBe("PLACE");
    expect(plateformeDepuisUrl("https://marches.maximilien.fr/entreprise/consultation/9")).toBe(
      "Maximilien",
    );
    expect(plateformeDepuisUrl("https://www.marches-publics.info/Annonces/lister")).toBe("AWS");
    expect(
      plateformeDepuisUrl("https://www.achatpublic.com/sdm/ent/gen/ent_detail.do?PCSLID=X"),
    ).toBe("achatpublic");
    expect(
      plateformeDepuisUrl("https://www.marches-securises.fr/entreprise/?module=consultation"),
    ).toBe("marches-securises");
    expect(plateformeDepuisUrl("https://www.e-marchespublics.com/x")).toBe("autre");
    expect(plateformeDepuisUrl("https://www.ville-exemple.fr")).toBeNull();
  });
});

describe("lireAvis", () => {
  it("trouve l'URL du DCE dans un avis eForms (donnees en chaîne JSON)", () => {
    const donnees = {
      EFORMS: {
        ContractNotice: {
          "cac:ContractingParty": {
            "cac:Party": { "cbc:WebsiteURI": "https://www.ville-exemple.fr" },
          },
          "cac:ProcurementProjectLot": {
            "cac:TenderingTerms": {
              "cac:CallForTendersDocumentReference": {
                "cac:Attachment": {
                  "cac:ExternalReference": {
                    "cbc:URI":
                      "https://marches.maximilien.fr/entreprise/consultation/123456?orgAcronyme=a1b",
                  },
                },
              },
            },
          },
          "cbc:Note": "Une visite obligatoire des lieux aura lieu le 12/10/2026.",
        },
      },
    };
    const lu = lireAvis({ idweb: "26-1", objet: "Travaux EP", donnees: JSON.stringify(donnees) });
    expect(lu.plateforme).toBe("Maximilien");
    expect(lu.url_dce).toContain("maximilien.fr/entreprise/consultation/123456");
    expect(lu.indices.visite.mentionnee).toBe(true);
    expect(lu.indices.visite.obligatoire).toBe(true);
  });

  it("lit le format historique et ignore les liens BOAMP", () => {
    const donnees = {
      IDENTITE: {
        URL_PROFIL_ACHETEUR: "http://www.marches-securises.fr",
        URL_DOCUMENT: "www.marches-securises.fr/entreprise/?module=consultation|dce&id=abc123",
      },
      RENSEIGNEMENTS_COMPLEMENTAIRES: "Voir https://www.boamp.fr/avis/detail/26-1",
      CONDITION_PARTICIPATION: {
        CAP_TECH: "Certificats de qualification Qualifelec ou équivalent, ISO 9001 apprécié.",
      },
    };
    const lu = lireAvis({ donnees: JSON.stringify(donnees) });
    expect(lu.plateforme).toBe("marches-securises");
    expect(lu.url_dce).toContain("id=abc123");
    expect(lu.indices.certifications).toEqual(["Qualifelec", "ISO 9001"]);
    expect(lu.indices.extraits_certifications.length).toBeGreaterThan(0);
  });

  it("ne retient pas un simple site web d'acheteur", () => {
    const lu = lireAvis({ donnees: { PARTY: { URL: "https://www.ville-exemple.fr" } } });
    expect(lu.url_dce).toBeNull();
    expect(lu.plateforme).toBeNull();
  });

  it("supporte un avis sans donnees", () => {
    const lu = lireAvis({ objet: "Maintenance éclairage public" });
    expect(lu.url_dce).toBeNull();
    expect(lu.indices.visite.mentionnee).toBe(false);
  });
});

describe("indicesDepuisTexte", () => {
  it("détecte une visite facultative", () => {
    const i = indicesDepuisTexte("Une visite sur site est facultative. Contact : M. X.");
    expect(i.visite.mentionnee).toBe(true);
    expect(i.visite.obligatoire).toBe(false);
  });

  it("détecte habilitations et AIPR sans accents", () => {
    const i = indicesDepuisTexte("Habilitations électriques B2V, BR et AIPR opérateur exigés.");
    expect(i.certifications).toEqual(["AIPR", "Habilitation électrique"]);
  });
});
