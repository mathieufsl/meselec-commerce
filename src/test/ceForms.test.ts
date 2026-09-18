import { describe, expect, it } from "vitest";
import {
  emptyCreateForm,
  suggestNextCeReference,
  toCreatePayload,
  validateCreateStep,
} from "@/lib/ceCreateForm";
import { isFormDirty, toForm, toPayload } from "@/lib/ceDetailForm";
import type { CeDossier } from "@/lib/commerceTypes";

describe("ceCreateForm", () => {
  it("requires raison sociale", () => {
    const form = emptyCreateForm();
    expect(validateCreateStep("identification", form)).toMatch(/raison sociale/i);
    form.nom_cible = "Cible SA";
    expect(validateCreateStep("identification", form)).toBeNull();
  });

  it("suggests next CE reference", () => {
    expect(suggestNextCeReference([], 2026)).toBe("CE-2026-1");
    expect(suggestNextCeReference(["CE-2026-1", "CE-2026-3", "CE-2025-9"], 2026)).toBe(
      "CE-2026-4",
    );
  });

  it("requires echeance offre when redressement", () => {
    const form = emptyCreateForm();
    form.nom_cible = "Cible";
    form.situation_juridique = "redressement";
    expect(validateCreateStep("situation", form)).toMatch(/échéance d'offre/i);
    form.date_echeance_offre = "2026-04-01";
    expect(validateCreateStep("situation", form)).toBeNull();
  });

  it("builds create payload with auto titre = raison sociale", () => {
    const form = emptyCreateForm();
    form.nom_cible = "Cible";
    form.situation_juridique = "redressement";
    form.date_echeance_offre = "2026-04-01";
    form.ca_estime = "1000";
    form.effectif = "12";
    const payload = toCreatePayload(form, "CE-2026-2");
    expect(payload.reference).toBe("CE-2026-2");
    expect(payload.titre).toBe("Cible");
    expect(payload.nom_cible).toBe("Cible");
    expect(payload.societe_acheteuse_id).toBeNull();
    expect(payload.date_echeance_offre).toBe("2026-04-01");
    expect(payload.statut).toBe("detection");
    expect(payload.situation_juridique).toBe("redressement");
    expect(payload.ca_estime).toBe(1000);
    expect(payload.effectif).toBe(12);
  });
});

describe("ceDetailForm", () => {
  const dossier: CeDossier = {
    id: "1",
    reference: "CE-1",
    titre: "Cible",
    nom_cible: "Cible",
    situation_juridique: "in_bonis",
    statut: "analyse",
    lieu: null,
    activite: null,
    ca_estime: 500,
    ebitda_estime: null,
    valorisation_estimee: null,
    effectif: null,
    interlocuteur: null,
    societe_acheteuse_id: "soc-1",
    date_detection: "2026-01-01",
    date_echeance_offre: null,
    date_closing_cible: null,
    notes: "note",
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  it("round-trips form payload", () => {
    const form = toForm(dossier);
    expect(form.ca_estime).toBe("500");
    expect(form.statut).toBe("analyse");
    expect(form.nom_cible).toBe("Cible");
    const payload = toPayload(form);
    expect(payload.ca_estime).toBe(500);
    expect(payload.titre).toBe("Cible");
    expect(payload.notes).toBe("note");
  });

  it("detects dirty state", () => {
    const form = toForm(dossier);
    expect(isFormDirty(form, form)).toBe(false);
    expect(isFormDirty(form, { ...form, nom_cible: "Autre" })).toBe(true);
  });
});
