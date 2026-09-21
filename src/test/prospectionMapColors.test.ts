import { describe, expect, it } from "vitest";
import {
  colorForMapValue,
  normalizePrestataireName,
  prestataireColor,
  UNSET_COLOR,
} from "@/lib/prospection/mapColors";
import type { ProspectionCommuneState } from "@/lib/prospection/api";

const baseState: ProspectionCommuneState = {
  status: "todo",
  gestion: "",
  prestataire: "",
  contact: "",
  contacts: [],
  notes: "",
};

describe("prestataireColor", () => {
  it("retourne une couleur stable pour un même nom", () => {
    const a = prestataireColor("Citeos");
    const b = prestataireColor("Citeos");
    expect(a).toBe(b);
    expect(a).not.toBe(UNSET_COLOR);
  });

  it("canonicalise les variantes avant hash", () => {
    expect(prestataireColor("  CITEOS ")).toBe(prestataireColor("Citeos"));
  });

  it("retourne la couleur non renseigné si vide", () => {
    expect(prestataireColor("")).toBe(UNSET_COLOR);
    expect(prestataireColor("   ")).toBe(UNSET_COLOR);
  });
});

describe("normalizePrestataireName", () => {
  it("canonicalise vers la nomenclature commune", () => {
    expect(normalizePrestataireName("  eiffage energie  ")).toBe("EES");
    expect(normalizePrestataireName("Eiffage + Satelec")).toBe("EES + Satelec");
    expect(normalizePrestataireName("MAIL ENVOYÉ")).toBe("");
    expect(normalizePrestataireName("CITEOS")).toBe("Citeos");
  });
});

describe("colorForMapValue", () => {
  it("utilise la couleur gestion pour le mode gestion", () => {
    const color = colorForMapValue("gestion", { ...baseState, gestion: "agglo" });
    expect(color).toBe("#16a34a");
  });
});
