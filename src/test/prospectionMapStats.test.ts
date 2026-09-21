import { describe, expect, it } from "vitest";
import { aggregatePrestataires, formatPercent } from "@/lib/prospection/mapStats";
import type { ProspectionCommuneState } from "@/lib/prospection/api";

const baseState: ProspectionCommuneState = {
  status: "todo",
  gestion: "",
  prestataire: "",
  contact: "",
  contacts: [],
  notes: "",
};

describe("aggregatePrestataires", () => {
  it("agrège et trie les prestataires par nombre de communes", () => {
    const entries = [
      { state: { ...baseState, prestataire: "CITEOS" } },
      { state: { ...baseState, prestataire: "Citeos" } },
      { state: { ...baseState, prestataire: "  citeos " } },
      { state: { ...baseState, prestataire: "EDF" } },
      { state: { ...baseState, prestataire: "" } },
    ];

    const stats = aggregatePrestataires(entries);
    expect(stats).toHaveLength(2);
    expect(stats[0].name).toBe("Citeos");
    expect(stats[0].count).toBe(3);
    expect(stats[0].percent).toBe(75);
    expect(stats[1].name).toBe("EDF");
    expect(stats[1].count).toBe(1);
  });

  it("limite au top N", () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      state: { ...baseState, prestataire: `Entreprise ${i}` },
    }));
    expect(aggregatePrestataires(entries, 5)).toHaveLength(5);
  });
});

describe("formatPercent", () => {
  it("formate un pourcentage en locale fr", () => {
    expect(formatPercent(6.789)).toMatch(/6,8/);
  });
});
