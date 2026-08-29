import { describe, expect, it } from "vitest";
import {
  calcLigneMontant,
  parseBpuTextImport,
  sumReponseLignes,
} from "@/lib/bpuEngine";

describe("bpuEngine", () => {
  it("calcule le montant d'une ligne", () => {
    expect(calcLigneMontant(3, 12.5)).toBe(37.5);
  });

  it("parse un import CSV simple", () => {
    const rows = parseBpuTextImport("1.1.1;Pose luminaire;u;35,62\n1.1.2;Câble;ml;4,5");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.numero_prix).toBe("1.1.1");
    expect(rows[0]?.pu_ht).toBe(35.62);
  });

  it("somme les lignes de réponse", () => {
    expect(
      sumReponseLignes([
        { quantite: 2, pu_ht: 10 },
        { quantite: 1, pu_ht: 5, montant: 5 },
      ]),
    ).toBe(25);
  });
});
