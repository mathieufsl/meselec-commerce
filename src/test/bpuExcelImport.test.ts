import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { parseBpuExcelBuffer } from "@/lib/bpuExcelImport";

describe("bpuExcelImport", () => {
  const files = [
    {
      path: "/Users/mathieufaessel/Downloads/3_MESELEC_2026.01 BPU Eclairage, illuminations et enfouissement.xlsx",
      format: "bpu_standard",
      minLines: 50,
    },
    {
      path: "/Users/mathieufaessel/Downloads/MESELEC_BPU v4_precision du 29042026.xlsx",
      format: "meselec_v4",
      minLines: 100,
    },
    {
      path: "/Users/mathieufaessel/Downloads/Chiffrage_05_05.xlsx",
      format: "chiffrage_devis",
      minLines: 10,
    },
    {
      path: "/Users/mathieufaessel/Downloads/20260611_GOU_BPU_Lot2_Ind002_MESELEC.xlsx",
      format: "bpu_standard",
      minLines: 50,
    },
    {
      path: "/Users/mathieufaessel/Downloads/26-641-100 - BPU-DQE_MESELEC.xlsx",
      format: "dqe",
      minLines: 5,
    },
  ];

  for (const f of files) {
    it(`extrait les lignes de ${f.path.split("/").pop()}`, () => {
      if (!fs.existsSync(f.path)) {
        console.warn("skip missing", f.path);
        return;
      }
      const buf = fs.readFileSync(f.path);
      const result = parseBpuExcelBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), f.path.split("/").pop());
      expect(result.format).toBe(f.format);
      expect(result.rows.length).toBeGreaterThanOrEqual(f.minLines);
      const first = result.rows[0];
      expect(first?.designation).toBeTruthy();
      expect(first?.pu_ht).toBeGreaterThan(0);
    });
  }
});
