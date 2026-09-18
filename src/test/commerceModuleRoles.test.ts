import { describe, expect, it } from "vitest";
import {
  commerceModuleForPath,
  countActiveCommerceModules,
  defaultFullCommerceModuleRoles,
  getCommerceDefaultLandingPath,
  isCommerceModuleFreePath,
  moduleRolesFromAccountRpc,
  normalizeCommerceModuleRoles,
  summarizeCommerceModules,
} from "@/lib/commerceModuleRoles";

describe("commerceModuleRoles", () => {
  it("normalise une map partielle", () => {
    const roles = normalizeCommerceModuleRoles({
      appels_offres: "viewer",
      catalogues: "editor",
      admin: "rien",
    });
    expect(roles.appels_offres).toBe("viewer");
    expect(roles.catalogues).toBe("editor");
    expect(roles.admin).toBe("rien");
    expect(roles.dashboard).toBe("rien");
  });

  it("interprète le RPC vide comme aucun module", () => {
    const roles = moduleRolesFromAccountRpc({});
    expect(countActiveCommerceModules(roles)).toBe(0);
    expect(summarizeCommerceModules(roles)).toBe("Aucun module");
  });

  it("résume l'accès total éditeur", () => {
    const roles = defaultFullCommerceModuleRoles();
    expect(summarizeCommerceModules(roles)).toBe("Tous (édition)");
  });

  it("associe veille et landing au bon module", () => {
    expect(commerceModuleForPath("/veille")).toBe("appels_offres");
    expect(commerceModuleForPath("/ce/abc")).toBe("ce");
    expect(getCommerceDefaultLandingPath(["ce", "admin"])).toBe("/ce");
    expect(getCommerceDefaultLandingPath([])).toBe("/profil");
    expect(isCommerceModuleFreePath("/profil")).toBe(true);
  });
});
