import { describe, expect, it } from "vitest";
import { suggestBailExpirationDate } from "@/lib/aoCreateForm";

describe("suggestBailExpirationDate", () => {
  it("adds months to start date", () => {
    expect(suggestBailExpirationDate("2026-12-01", "48")).toBe("2030-12-01");
  });

  it("returns empty when inputs are incomplete", () => {
    expect(suggestBailExpirationDate("", "12")).toBe("");
    expect(suggestBailExpirationDate("2026-12-01", "")).toBe("");
    expect(suggestBailExpirationDate("2026-12-01", "0")).toBe("");
  });
});
