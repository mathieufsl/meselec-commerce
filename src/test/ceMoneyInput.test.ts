import { describe, expect, it } from "vitest";
import { formatCeAmountDisplay, parseCeAmountInput } from "@/lib/ceMoneyInput";

describe("ceMoneyInput", () => {
  it("formats with french thousands separators", () => {
    expect(formatCeAmountDisplay("2000000")).toBe("2\u202f000\u202f000");
    expect(formatCeAmountDisplay("300000")).toBe("300\u202f000");
    expect(formatCeAmountDisplay("")).toBe("");
    expect(formatCeAmountDisplay("1500.5")).toBe("1\u202f500,5");
  });

  it("parses grouped input back to raw digits", () => {
    expect(parseCeAmountInput("2 000 000")).toBe("2000000");
    expect(parseCeAmountInput("2\u202f000\u202f000")).toBe("2000000");
    expect(parseCeAmountInput("1 500,25")).toBe("1500.25");
    expect(parseCeAmountInput("")).toBe("");
  });
});
