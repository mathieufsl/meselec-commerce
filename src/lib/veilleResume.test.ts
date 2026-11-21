import { describe, expect, it } from "vitest";
import { parseResumeResponse, RESUME_TOOL_NAME } from "@/lib/veilleResume";

describe("parseResumeResponse", () => {
  it("lit le résumé et retire les sections vides", () => {
    const r = parseResumeResponse({
      content: [
        {
          type: "tool_use",
          name: RESUME_TOOL_NAME,
          input: {
            en_bref: " Travaux de GTC. ",
            sections: [
              { titre: "Dates clés", points: ["Limite : 14/12/2026 12h", ""] },
              { titre: "Vide", points: [] },
            ],
          },
        },
      ],
    });
    expect(r.en_bref).toBe("Travaux de GTC.");
    expect(r.sections).toEqual([{ titre: "Dates clés", points: ["Limite : 14/12/2026 12h"] }]);
  });

  it("échoue sans appel d'outil", () => {
    expect(() => parseResumeResponse({ content: [{ type: "text" }] })).toThrow();
  });
});
