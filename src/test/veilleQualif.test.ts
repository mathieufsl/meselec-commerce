import { describe, expect, it } from "vitest";
import { domainesDetectes } from "@/lib/veille";
import { aplatirDonnees, detecterPlateforme, extraireCpv, extraireUrls } from "@/lib/veilleAvis";
import { buildSystemPrompt, parseQualificationResponse, QUALIF_TOOL_NAME } from "@/lib/veilleQualif";

describe("domainesDetectes", () => {
  it("ne classe pas un LAEP (crèche) en Hydraulique", () => {
    const d = domainesDetectes(
      "",
      "Concession de service public pour la gestion d'un EAJE et un LAEP",
    );
    expect(d).not.toContain("Hydraulique");
  });

  it("ne matche pas via le nom de l'acheteur SIAAP (seuls intitulé + descripteur comptent)", () => {
    // Le collecteur ne transmet que l'intitulé et le descripteur.
    const d = domainesDetectes("42900000", "Fourniture de centrifugeuses Équipements industriels");
    expect(d).toEqual([]);
  });

  it("ne classe pas un réseau de chaleur en Réseaux électriques", () => {
    const d = domainesDetectes("", "Extension du réseau de chaleur et raccordement de bâtiments");
    expect(d).not.toContain("Réseaux électriques");
  });

  it("détecte la rénovation de l'éclairage public LED", () => {
    expect(domainesDetectes("", "Rénovation de l'éclairage public LED")).toContain(
      "Éclairage public",
    );
  });

  it("compare le CPV au préfixe défini (codes parents)", () => {
    // Codes parents : 45316000 couvre l'éclairage et la signalisation (45316110, 45316212…).
    expect(domainesDetectes("45316000", "Travaux")).toContain("Éclairage public");
    expect(domainesDetectes("45316212", "Travaux")).toContain("Éclairage public");
    expect(domainesDetectes("45316110", "Travaux")).toContain("Éclairage public");
    // Mais pas un code voisin hors du parent.
    expect(domainesDetectes("45317000", "Travaux")).not.toContain("Éclairage public");
    expect(domainesDetectes("31527200", "Lot unique")).toContain(
      "Fournitures éclairage / électrique",
    );
  });
});

describe("lecture de l'avis complet", () => {
  const donneesEforms = JSON.stringify({
    EFORMS: {
      "cac:ProcurementProject": {
        "cbc:Name": { "@languageID": "FRA", "#text": "Lot CFO/CFA" },
        "cac:MainCommodityClassification": {
          "cbc:ItemClassificationCode": { "@listName": "cpv", "#text": "45311100" },
        },
      },
      "cbc:URI":
        "https://www.marches-publics.info/mpiaws/index.cfm?fuseaction=dematEnt.login&amp;type=DCE&amp;IDM=1891429",
    },
  });
  const donneesFns = JSON.stringify({
    FNSimple: {
      initial: {
        communication: { urlProfilAch: "https://www.marches-publics.gouv.fr/" },
        natureMarche: { codeCPV: { objetPrincipal: { classPrincipale: "45316000" } } },
      },
    },
  });

  it("extrait les CPV des deux formats", () => {
    expect(extraireCpv(donneesEforms)).toEqual(["45311100"]);
    expect(extraireCpv(donneesFns)).toEqual(["45316000"]);
  });

  it("extrait les URLs en décodant &amp;", () => {
    expect(extraireUrls(donneesEforms)).toContain(
      "https://www.marches-publics.info/mpiaws/index.cfm?fuseaction=dematEnt.login&type=DCE&IDM=1891429",
    );
  });

  it("aplatit le texte sans clés techniques", () => {
    const txt = aplatirDonnees(donneesEforms);
    expect(txt).toContain("Lot CFO/CFA");
    expect(txt).not.toContain("@languageID");
  });
});

describe("detecterPlateforme", () => {
  it("AWS avec IDM", () => {
    const r = detecterPlateforme([
      "http://www.ch-sud-seine-et-marne.fr",
      "https://www.marches-publics.info/mpiaws/index.cfm?fuseaction=demat.termes&amp;IDM=1891429",
      "https://www.marches-publics.info/mpiaws/index.cfm?fuseaction=dematEnt.login&amp;type=DCE&amp;IDM=1891429",
    ]);
    expect(r.plateforme).toBe("AWS");
    expect(r.dce_url).toBe(
      "https://www.marches-publics.info/mpiaws/index.cfm?fuseaction=dematEnt.login&type=DCE&IDM=1891429",
    );
  });

  it("Maximilien", () => {
    const url = "https://marches.maximilien.fr/entreprise/consultation/950530?orgAcronyme=g3h";
    expect(detecterPlateforme([url])).toEqual({ plateforme: "Maximilien", dce_url: url });
  });

  it("PLACE avec une URL générique", () => {
    const r = detecterPlateforme([
      "https://www.marches-publics.gouv.fr/entreprise",
      "https://dume.chorus-pro.gouv.fr/",
    ]);
    expect(r).toEqual({
      plateforme: "PLACE",
      dce_url: "https://www.marches-publics.gouv.fr/entreprise",
    });
  });

  it("aucune URL → inconnue", () => {
    expect(detecterPlateforme([])).toEqual({ plateforme: "inconnue", dce_url: null });
  });
});

describe("parseQualificationResponse", () => {
  const input = {
    entite: "MESELEC",
    decision: "prioritaire",
    score: 85,
    type_marche: "travaux",
    resume: "Lot CFO/CFA d'un bâtiment hospitalier.",
    raisons: ["Métier cœur", "Seine-et-Marne"],
    points_rouges: ["Visite obligatoire"],
    certif_manquante: false,
    interet_relationnel: false,
    exigences: {
      certifications: [],
      chiffre_affaires_min: null,
      references: null,
      visite_obligatoire: true,
      date_visite: "12/11/2026",
      montant_estime: null,
      duree: null,
      allotissement: "Lot 5",
      criteres_attribution: [{ critere: "Prix", ponderation: "60 %" }],
      avis_insuffisant: false,
    },
  };
  const reponse = (inp: unknown) => ({
    stop_reason: "tool_use",
    content: [{ type: "tool_use", name: QUALIF_TOOL_NAME, input: inp }],
    usage: { input_tokens: 5000, output_tokens: 400 },
  });

  it("valide une sortie correcte et renvoie l'usage", () => {
    const { qualification, usage } = parseQualificationResponse(reponse(input));
    expect(qualification.decision).toBe("prioritaire");
    expect(qualification.exigences.criteres_attribution[0]?.critere).toBe("Prix");
    expect(usage).toEqual({ input_tokens: 5000, output_tokens: 400 });
  });

  it("plafonne le score à 60 et rétrograde si certification manquante", () => {
    const { qualification } = parseQualificationResponse(
      reponse({ ...input, certif_manquante: true, score: 90 }),
    );
    expect(qualification.score).toBe(60);
    expect(qualification.decision).toBe("a_creuser");
  });

  it("rejette une sortie invalide", () => {
    expect(() => parseQualificationResponse(reponse({ ...input, decision: "peut-être" }))).toThrow(
      /Sortie invalide/,
    );
  });

  it("rejette une réponse sans appel d'outil", () => {
    expect(() =>
      parseQualificationResponse({ stop_reason: "end_turn", content: [{ type: "text" }] }),
    ).toThrow(/sans appel/);
  });
});

describe("buildSystemPrompt", () => {
  it("sérialise les profils", () => {
    const p = buildSystemPrompt([
      {
        entite: "MESELEC",
        actif: true,
        metiers: ["éclairage public"],
        hors_perimetre: [],
        departements: ["75", "60"],
        certifications_detenues: [],
        certifications_manquantes: ["MASE"],
        montant_min: null,
        montant_max: null,
        regles: "Règle test",
      },
    ]);
    expect(p).toContain("## MESELEC");
    expect(p).toContain("75 ; 60");
    expect(p).toContain("Règle test");
  });
});
