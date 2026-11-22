import type { ExecutionRobot } from "@/lib/veilleRobot";

// Dépôt Lovable : c'est lui qui porte les secrets du robot.
const GITHUB_DEPOT = "mathieufsl/rms-commerce";
const GITHUB_WORKFLOW = "veille-dce.yml";

/**
 * Lance le robot DCE (workflow GitHub Actions). Le robot traite toutes les
 * annonces `analyse_statut = 'a_faire'`. Sans jeton GitHub, renvoie false :
 * les demandes sont alors reprises au passage planifié du matin.
 */
export async function lancerRobotDce(
  options: {
    collecte?: boolean;
    /** Veille manuelle : sources et critères (JSON lu par scripts/dce/run.ts). */
    parametres?: Record<string, unknown>;
  } = {},
): Promise<boolean> {
  const jeton = process.env["GITHUB_DISPATCH_TOKEN"];
  if (!jeton) return false;
  let res: Response;
  try {
    res = await fetch(
      `https://api.github.com/repos/${GITHUB_DEPOT}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jeton}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "rms-commerce-veille",
        },
        // Pas d'annonce ciblée : le robot traite toutes les demandes en attente,
        // ce qui couvre plusieurs demandes rapprochées (une seule exécution à la fois).
        body: JSON.stringify({
          ref: "main",
          inputs: {
            collecte: options.collecte ? "true" : "false",
            ...(options.parametres ? { parametres: JSON.stringify(options.parametres) } : {}),
          },
        }),
      },
    );
  } catch (e) {
    console.error(`[veille-dce] GitHub injoignable : ${(e as Error).message}`);
    return false;
  }
  if (!res.ok) {
    console.error(`[veille-dce] GitHub ${res.status} : ${await res.text()}`);
    return false;
  }
  return true;
}

/**
 * Dernières exécutions du robot sur GitHub, pour savoir si une demande attend
 * derrière une autre exécution (une seule à la fois) ou a échoué au démarrage.
 * Renvoie null sans jeton ou si GitHub ne répond pas.
 */
export async function executionsRobotDce(): Promise<ExecutionRobot[] | null> {
  const jeton = process.env["GITHUB_DISPATCH_TOKEN"];
  if (!jeton) return null;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_DEPOT}/actions/workflows/${GITHUB_WORKFLOW}/runs?per_page=6`,
      {
        headers: {
          Authorization: `Bearer ${jeton}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "rms-commerce-veille",
        },
      },
    );
    if (!res.ok) {
      console.error(`[veille-dce] GitHub ${res.status} : ${await res.text()}`);
      return null;
    }
    const json = (await res.json()) as {
      workflow_runs?: Array<{
        id: number;
        status: string;
        conclusion: string | null;
        created_at: string;
        html_url: string;
        event: string;
      }>;
    };
    return (json.workflow_runs ?? []).map((r) => ({
      id: r.id,
      statut: r.status,
      conclusion: r.conclusion,
      debut: r.created_at,
      url: r.html_url,
      declenchement: r.event,
    }));
  } catch (e) {
    console.error(`[veille-dce] GitHub injoignable : ${(e as Error).message}`);
    return null;
  }
}
