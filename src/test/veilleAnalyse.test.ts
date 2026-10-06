import { describe, expect, it } from "vitest";
import { pointsRecap, resumeAnalyseLignes, type VeilleAnalyse } from "@/lib/veilleAnalyse";

const analyse: VeilleAnalyse = {
  visite: {
    exigee: "obligatoire",
    dates: ["14/10/2026 à 10h"],
    modalites: "Rendez-vous auprès des services techniques",
    source: "RC art. 5.2",
  },
  certifications: [
    { nom: "Qualifelec EP2", exigence: "equivalent_accepte", detail: null, source: "RC art. 6" },
    { nom: "AIPR", exigence: "obligatoire", detail: "encadrant", source: null },
  ],
  autres_exigences: [],
  date_limite_questions: "20/10/2026",
  resume: "Marché de maintenance EP.",
  points_attention: [],
};

describe("resumeAnalyseLignes", () => {
  it("résume visite, certifications et questions", () => {
    expect(resumeAnalyseLignes(analyse)).toEqual([
      "Visite obligatoire (14/10/2026 à 10h) — Rendez-vous auprès des services techniques",
      "Certifications : Qualifelec EP2 ou équivalent, AIPR exigée",
      "Questions jusqu'au : 20/10/2026",
    ]);
  });
});

describe("pointsRecap", () => {
  it("utilise les indices de l'avis sans analyse", () => {
    expect(
      pointsRecap({
        analyse_dce: null,
        analyse_statut: "a_faire",
        avis_indices: { visite: { mentionnee: true, obligatoire: true }, certifications: ["MASE"] },
      }),
    ).toEqual([
      "Visite obligatoire (selon l'avis)",
      "Certifications citées dans l'avis : MASE",
      "Analyse du DCE à venir",
    ]);
  });

  it("préfère l'analyse DCE", () => {
    expect(pointsRecap({ analyse_dce: analyse })[0]).toContain("Visite obligatoire (14/10/2026");
  });
});
