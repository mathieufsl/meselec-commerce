import { describe, expect, it } from "vitest";
import {
  commerceAccountDisplayName,
  isValidCommerceEmail,
  normalizeCommerceEmail,
  validateCommercePassword,
} from "@/lib/commerceAccounts";

describe("commerceAccounts", () => {
  it("normalise et valide les emails", () => {
    expect(normalizeCommerceEmail("  Jean.Dupont@Meselec.FR ")).toBe("jean.dupont@meselec.fr");
    expect(isValidCommerceEmail("jean@meselec.fr")).toBe(true);
    expect(isValidCommerceEmail("pas-un-email")).toBe(false);
  });

  it("valide les mots de passe", () => {
    expect(validateCommercePassword("short")).toMatch(/8 caractères/);
    expect(validateCommercePassword("longenough", "different")).toMatch(/correspondent/);
    expect(validateCommercePassword("longenough", "longenough")).toBeNull();
  });

  it("affiche le nom du compte", () => {
    expect(commerceAccountDisplayName({ prenom: "Jean", nom: "Dupont" })).toBe("Jean Dupont");
    expect(commerceAccountDisplayName({})).toBe("—");
  });
});
