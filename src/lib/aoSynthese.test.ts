import { describe, expect, it } from "vitest";
import { joursAvant, libelleLieu } from "@/lib/aoSynthese";

describe("joursAvant", () => {
  const ref = new Date(2026, 10, 21, 17, 45);
  it("compte les jours jusqu'à l'échéance", () => {
    expect(joursAvant("2026-12-21", ref)).toBe(30);
    expect(joursAvant("2026-11-21", ref)).toBe(0);
    expect(joursAvant("2026-11-20", ref)).toBe(-1);
    expect(joursAvant("", ref)).toBeNull();
  });
});

describe("libelleLieu", () => {
  it("préfixe un numéro de département", () => {
    expect(libelleLieu("93")).toBe("Dép. 93");
    expect(libelleLieu("2A")).toBe("Dép. 2A");
    expect(libelleLieu("Aulnay-sous-Bois")).toBe("Aulnay-sous-Bois");
  });
});
