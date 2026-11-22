import { describe, expect, it } from "vitest";
import { diagnostiquerAttente, type ExecutionRobot } from "./veilleRobot";

const T0 = new Date("2026-11-22T11:48:00Z").getTime();
const iso = (minutes: number) => new Date(T0 + minutes * 60_000).toISOString();
const exec = (p: Partial<ExecutionRobot> & { debut: string }): ExecutionRobot => ({
  id: 1,
  statut: "completed",
  conclusion: "success",
  url: "https://github.com/x/run/1",
  declenchement: "workflow_dispatch",
  ...p,
});

describe("diagnostiquerAttente", () => {
  it("file d'attente derrière une collecte en cours", () => {
    const d = diagnostiquerAttente(
      iso(0),
      [
        exec({ id: 2, statut: "queued", conclusion: null, debut: iso(0.1), url: "u2" }),
        exec({ id: 1, statut: "in_progress", conclusion: null, debut: iso(-25), url: "u1" }),
      ],
      T0 + 9 * 60_000,
    );
    expect(d?.texte).toMatch(/file d'attente.*une autre exécution.*34 min/);
    expect(d?.url).toBe("u1");
    expect(d?.relancer).toBe(false);
    expect(d?.alerte).toBe(false);
  });

  it("signale une exécution qui bloque depuis longtemps", () => {
    const d = diagnostiquerAttente(
      iso(0),
      [
        exec({ id: 2, statut: "queued", conclusion: null, debut: iso(0) }),
        exec({ id: 1, statut: "in_progress", conclusion: null, debut: iso(-50) }),
      ],
      T0 + 5 * 60_000,
    );
    expect(d?.texte).toMatch(/semble bloquée/);
    expect(d?.alerte).toBe(true);
  });

  it("installation en cours", () => {
    const d = diagnostiquerAttente(
      iso(0),
      [exec({ statut: "in_progress", conclusion: null, debut: iso(0.2) })],
      T0 + 2 * 60_000,
    );
    expect(d?.texte).toMatch(/préparation/);
  });

  it("échec au démarrage : proposer de relancer", () => {
    const d = diagnostiquerAttente(
      iso(0),
      [exec({ conclusion: "failure", debut: iso(0.1) })],
      T0 + 6 * 60_000,
    );
    expect(d?.relancer).toBe(true);
    expect(d?.texte).toMatch(/erreur/);
  });

  it("aucune exécution lancée", () => {
    const anciennes = [exec({ debut: iso(-300) })];
    expect(diagnostiquerAttente(iso(0), anciennes, T0 + 60_000)).toBeNull();
    expect(diagnostiquerAttente(iso(0), anciennes, T0 + 5 * 60_000)?.relancer).toBe(true);
  });

  it("état GitHub inconnu : alerte au-delà de 10 min seulement", () => {
    expect(diagnostiquerAttente(iso(0), null, T0 + 5 * 60_000)).toBeNull();
    expect(diagnostiquerAttente(iso(0), null, T0 + 12 * 60_000)?.relancer).toBe(true);
  });
});
