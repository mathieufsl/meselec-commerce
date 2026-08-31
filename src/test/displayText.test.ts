import { describe, expect, it } from "vitest";
import { cleanDisplaySeparators } from "@/lib/displayText";

describe("cleanDisplaySeparators", () => {
  it("remplace le tiret cadratin par une virgule", () => {
    expect(cleanDisplaySeparators("Rue Flachat — Asnières-sur-Seine")).toBe(
      "Rue Flachat, Asnières-sur-Seine",
    );
  });

  it("gère les doubles tirets", () => {
    expect(cleanDisplaySeparators("A -- B")).toBe("A, B");
  });
});
