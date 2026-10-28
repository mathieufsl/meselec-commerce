import { describe, expect, it } from "vitest";
import { normalizeResponsables, toggleResponsable } from "@/lib/prospection/responsables";

describe("responsables prospection", () => {
  it("normalise les valeurs de la base", () => {
    expect(normalizeResponsables(null)).toEqual([]);
    expect(normalizeResponsables(["Said", " Rida ", "Said", ""])).toEqual(["Rida", "Said"]);
    expect(normalizeResponsables(["Autre", "Mathieu"])).toEqual(["Mathieu", "Autre"]);
  });

  it("ajoute et retire une personne", () => {
    expect(toggleResponsable([], "Said")).toEqual(["Said"]);
    expect(toggleResponsable(["Said"], "Rida")).toEqual(["Rida", "Said"]);
    expect(toggleResponsable(["Rida", "Said"], "Said")).toEqual(["Rida"]);
  });
});
