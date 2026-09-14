import { describe, expect, it } from "vitest";
import {
  createEmptyContact,
  createMaireContact,
  formatContactLine,
  hydrateContacts,
  parseContactsJson,
  summarizeContacts,
} from "@/lib/prospection/contacts";

describe("prospection contacts", () => {
  it("parses contacts_json including empty draft rows", () => {
    const parsed = parseContactsJson([
      { id: "1", type: "maire", nom: "Dupont", telephone: "01", email: "" },
      { id: "2", type: "dst", nom: "", telephone: "", email: "" },
      { id: "3", type: "unknown", nom: "X", telephone: "", email: "" },
    ]);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({ type: "maire", nom: "Dupont", telephone: "01" });
    expect(parsed[1]).toMatchObject({ type: "dst", nom: "" });
    expect(parsed[2].type).toBe("autre");
  });

  it("hydrates from legacy contact text when JSON is empty", () => {
    expect(hydrateContacts([], "Jean 06 12")).toEqual([
      expect.objectContaining({ type: "autre", nom: "Jean 06 12" }),
    ]);
    expect(hydrateContacts([{ id: "1", type: "dst", nom: "A", telephone: "", email: "" }], "legacy")).toEqual(
      [expect.objectContaining({ type: "dst", nom: "A" })],
    );
  });

  it("formats and summarizes contacts", () => {
    const maire = createMaireContact({ nom: "Baguet", telephone: "01 55 18 53 00" });
    const dst = createEmptyContact("dst", { nom: "Martin", telephone: "06 00" });
    expect(formatContactLine(maire)).toBe("Maire · Baguet · 01 55 18 53 00");
    expect(summarizeContacts([maire, dst])).toBe(
      "Maire · Baguet · 01 55 18 53 00 | DST · Martin · 06 00",
    );
  });
});
